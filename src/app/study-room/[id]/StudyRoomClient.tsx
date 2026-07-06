"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Loader2, ChevronLeft, Clock, GraduationCap, ShieldCheck } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import dynamic from "next/dynamic";
import SessionReviewModal from "@/components/sessions/SessionReviewModal";
import { Z } from "@/lib/layers";
import { motion, AnimatePresence } from "framer-motion";
import { VideoProvider } from "@/components/video/VideoProvider";
import { StartCallButton } from "@/components/video/StartCallButton";
import { IncomingCall } from "@/components/video/IncomingCall";
import { ActiveCall } from "@/components/video/ActiveCall";
import type { Call } from "@stream-io/video-react-sdk";

const StreamChatRoom = dynamic(
  () => import("@/components/stream/StreamChatRoom"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
      </div>
    ),
  },
);

export interface StudyRoomSession {
  id: string;
  tier: string;
  subject: string;
  topic?: string;
  status: string;
  studentId: string;
  partnerId?: string;
  student: { name: string; avatar?: string };
  partner?: { name: string; avatar?: string };
}

export interface StudyRoomInitialData {
  sessionId: string;
  session: StudyRoomSession;
  currentUser: { id: string; name?: string; avatar?: string };
}

function StudyRoomInner({ initialData }: { initialData: StudyRoomInitialData }) {
  const router = useRouter();

  const [session, setSession] = useState<StudyRoomSession>(initialData.session);
  const [showReview, setShowReview] = useState(false);
  const [showNoShowPrompt, setShowNoShowPrompt] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const currentUser = initialData.currentUser;
  const sessionId = initialData.sessionId;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const fetchSession = useCallback(async () => {
    try {
      const { getSession: fetchSessionAction } = await import("@/app/actions/match");
      let data: any = await fetchSessionAction(sessionId);
      if (!data) {
        const { getBookingSessionData } = await import("@/app/actions/bookings");
        data = await getBookingSessionData(sessionId);
      }
      if (data) {
        setSession({
          id: data.id,
          tier: data.tier,
          subject: data.subject,
          topic: data.topic,
          status: data.status,
          studentId: data.studentId,
          partnerId: data.partnerId,
          student: {
            name: data.student?.name || "Student",
            avatar: data.student?.avatar || undefined,
          },
          partner: data.partner
            ? {
                name: data.partner.name,
                avatar: data.partner.avatar || undefined,
              }
            : undefined,
        });
      }
    } catch {
      showError({
        title: "Couldn't refresh the room",
        cause: "There was a hiccup.",
        fix: "Try again — everything is still saved.",
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (session && session.tier === "TUTOR" && session.studentId === currentUser?.id) {
      const timer = setTimeout(() => {
        setShowNoShowPrompt(true);
      }, 5 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [session, currentUser]);

  useEffect(() => {
    if (!session?.partnerId) {
      const interval = setInterval(() => {
        fetchSession();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [session?.partnerId, fetchSession]);

  const handleEndSession = async () => {
    if (!session) return;
    const { completeSession } = await import("@/app/actions/match");
    const result = await completeSession(sessionId);

    if (result?.pointsAwarded) {
      showSuccess(`+${result.pointsAwarded} points`, { description: "Session logged." });
    } else {
      showSuccess("Session finished", { description: "Sessions under 2 minutes don't earn points." });
    }

    if (session.tier === "TUTOR" && session.studentId === currentUser?.id) {
      setShowReview(true);
    } else {
      router.push("/dashboard");
    }
  };

  const handleReviewClose = () => {
    setShowReview(false);
    router.push("/dashboard");
  };

  const participants = [
    { ...session.student, isCurrentUser: session.studentId === currentUser.id, role: session.tier === "TUTOR" ? "Student" : "You" },
    ...(session.partner ? [{ ...session.partner, isCurrentUser: session.partnerId === currentUser.id, role: session.tier === "TUTOR" ? "Tutor" : "Buddy" }] : []),
  ];

  if (activeCall) {
    return (
      <ActiveCall
        call={activeCall}
        onEnd={() => setActiveCall(null)}
        subject={`${session.subject}${session.topic ? ` — ${session.topic}` : ""}`}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      <header className="h-14 md:h-16 border-b border-border/20 px-4 md:px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] shrink-0" style={{ zIndex: Z.STICKY }}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/60 active:scale-95 transition-all shrink-0"
            aria-label="Leave room"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold truncate">{session.subject}</h1>
            <p className="text-[12px] text-muted-foreground truncate">
              {session.topic || "Study Room"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground/60 tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(sessionDuration)}
          </div>
          <div className="hidden sm:flex -space-2">
            <AvatarPremium seed={session.student?.name} size="sm" className="border-2 border-background" />
            {session.partner && (
              <AvatarPremium seed={session.partner.name} size="sm" className="border-2 border-background" />
            )}
          </div>
          <Button
            onClick={() => setShowLeaveConfirm(true)}
            variant="ghost"
            className="h-8 px-3 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            Leave
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-72 border-r border-border/20 hidden lg:flex flex-col gap-5 p-5 overflow-y-auto bg-background">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium">{session.subject}</p>
              <p className="text-[11px] text-muted-foreground">{session.topic || "Study Room"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground/60 px-1">Participants</p>
            <div className="space-y-1">
              {participants.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    p.isCurrentUser ? "bg-primary/5" : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    <AvatarPremium seed={p.name} size="sm" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {p.name}{p.isCurrentUser ? " (you)" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{p.role}</p>
                  </div>
                </motion.div>
              ))}
              {!session.partner && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-border/30">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">Waiting for someone</p>
                    <p className="text-[11px] text-muted-foreground/60">Shouldn't take long</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto p-4 rounded-2xl border border-border/20 bg-secondary/20">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Private session
            </div>
            <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
              Only you and your partner can see this room.
            </p>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-background relative min-w-0 min-h-0">
          <IncomingCall onAccepted={(call) => setActiveCall(call)} />

          {session.partnerId && (
            <div className="px-4 pt-3 pb-1 flex justify-end shrink-0">
              <StartCallButton
                roomId={sessionId}
                otherUserId={
                  session.studentId === currentUser.id
                    ? session.partnerId
                    : session.studentId
                }
                otherUserName={session.partner?.name || "Partner"}
              />
            </div>
          )}

          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex-1 flex flex-col min-w-0 border-r border-border/20">
              <StreamChatRoom
                channelId={sessionId}
                userId={currentUser.id}
                userName={currentUser.name || "User"}
                userImage={currentUser.avatar}
                memberIds={session.partnerId ? [session.partnerId] : []}
                channelName={`${session.subject} - ${session.topic || "Study Session"}`}
                mashAI={{
                  tier: session.tier,
                  subject: session.subject,
                  topic: session.topic,
                }}
              />
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            style={{ zIndex: Z.STICKY + 10 }}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-3xl p-7 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Leave this room?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your progress will be saved. You can start a new session anytime.
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={handleEndSession}
                  className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[15px] font-medium transition-all"
                >
                  End session
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full h-12 rounded-xl text-[15px] font-medium text-foreground"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SessionReviewModal
        open={showReview}
        onClose={handleReviewClose}
        sessionId={sessionId}
        tutorName={session.partner?.name || "your tutor"}
        subject={session.subject}
      />
    </div>
  );
}

export default function StudyRoomClient({ initialData }: { initialData: StudyRoomInitialData }) {
  return (
    <VideoProvider>
      <StudyRoomInner initialData={initialData} />
    </VideoProvider>
  );
}
