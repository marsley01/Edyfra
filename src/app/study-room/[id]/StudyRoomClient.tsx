"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ShieldCheck, ChevronLeft, Users, LogOut, BookOpen, Clock } from "lucide-react";
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  // Track session duration
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
        title: "Session didn't refresh",
        cause: "We lost track of the room for a second.",
        fix: "Try again — your study session is still safe.",
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

  const handleConvertToMashAI = async () => {
    setConverting(true);
    try {
      const { convertBookingToMashAI } = await import("@/app/actions/bookings");
      const result = await convertBookingToMashAI(sessionId);
      if (result.success && result.sessionId) {
        showSuccess("Connected to Mash AI", { description: "Your study buddy is ready when you are." });
        router.push(`/study-room/${result.sessionId}`);
      } else {
        showError({
          title: "Couldn't start the session",
          cause: "The room conversion didn't complete.",
          fix: "Try again, or refresh the page.",
        });
      }
    } catch {
      showError({
        title: "Something went sideways",
        cause: "An unexpected hiccup stopped that.",
        fix: "Try again in a moment.",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    const { completeSession } = await import("@/app/actions/match");
    const result = await completeSession(sessionId);

    if (result?.pointsAwarded) {
      showSuccess(`+${result.pointsAwarded} points earned!`, { description: "Nice work — that session is logged." });
    } else {
      showSuccess("Session finished", { description: "No points this time — sessions under 2 minutes don't count." });
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
    ...(session.partner ? [{ ...session.partner, isCurrentUser: session.partnerId === currentUser.id, role: session.tier === "TUTOR" ? "Tutor" : "Study Buddy" }] : []),
  ];

  // If a video call is active, show it full-screen
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
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden font-sans">
      <header
        className="h-16 md:h-20 border-b border-border/50 px-4 md:px-8 flex items-center justify-between bg-background/80 backdrop-blur-2xl pt-[env(safe-area-inset-top,0px)] shrink-0"
        style={{ zIndex: Z.STICKY }}
      >
        <div className="flex items-center gap-3 md:gap-6 min-w-0">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="p-2 -ml-1 text-foreground hover:bg-primary/5 rounded-xl transition-colors shrink-0"
            aria-label="Leave room"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase tracking-widest truncate">{session.subject}</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                {session.topic || "Study Session"}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black tracking-widest uppercase">
              {session.status === "ACTIVE" ? "Live" : session.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {showNoShowPrompt && (
            <Button
              onClick={handleConvertToMashAI}
              disabled={converting}
              variant="outline"
              className="hidden md:flex h-10 px-4 rounded-xl border-yellow-500/50 text-yellow-500 font-black text-[10px] tracking-widest uppercase hover:bg-yellow-500/10"
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tutor Unavailable? Use AI"}
            </Button>
          )}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-black text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" />
            {formatDuration(sessionDuration)}
          </div>
          <div className="hidden md:flex -space-x-3">
            <AvatarPremium seed={session.student?.name} size="sm" className="border-2 border-background" />
            {session.partner && (
              <AvatarPremium seed={session.partner.name} size="sm" className="border-2 border-background" />
            )}
          </div>
          <Button
            onClick={() => setShowLeaveConfirm(true)}
            variant="ghost"
            className="h-9 md:h-10 px-4 md:px-6 rounded-xl border border-border/50 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-72 xl:w-80 border-r border-border/50 bg-secondary/20 hidden lg:flex flex-col gap-6 p-6 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Participants ({participants.length})
              </p>
            </div>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    p.isCurrentUser
                      ? "bg-primary/5 border-primary/20"
                      : "bg-background border-border/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <AvatarPremium seed={p.name} size="sm" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">
                      {p.name}{p.isCurrentUser ? " (you)" : ""}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{p.role}</p>
                  </div>
                </motion.div>
              ))}
              {!session.partner && (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-border/50 bg-secondary/30">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-muted-foreground">Finding someone…</p>
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Usually under 30s</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session Details</p>
            <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Subject</p>
                  <p className="text-xs font-bold">{session.subject}</p>
                </div>
              </div>
              {session.topic && (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Topic</p>
                    <p className="text-xs font-bold">{session.topic}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Duration</p>
                  <p className="text-xs font-bold font-mono">{formatDuration(sessionDuration)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> End-to-end private
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-snug">
              Your session is completely private — only visible to you and your partner.
            </p>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-background relative min-w-0 min-h-0">
          {/* Incoming call listener — visible inside the study room */}
          <IncomingCall onAccepted={(call) => setActiveCall(call)} />

          {/* Video call button in the top toolbar area */}
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
          <div className="py-1.5 text-center border-t border-border/30 shrink-0">
            <span className="text-[9px] font-medium text-muted-foreground/40">
              🔒 This session is private and secure
            </span>
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
              className="w-full max-w-sm bg-card border border-border rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <LogOut className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-black tracking-tightest">Leave this room?</h2>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Leaving will end the session and your progress will be saved. You can always start a new one.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleEndSession}
                  className="w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-red-500/20 transition-all"
                >
                  Yes, end this session
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-full h-12 rounded-2xl font-black text-[10px] tracking-widest uppercase"
                >
                  Stay — keep learning
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

// Wrap with VideoProvider so the call SDK is available inside the study room
export default function StudyRoomClient({ initialData }: { initialData: StudyRoomInitialData }) {
  return (
    <VideoProvider>
      <StudyRoomInner initialData={initialData} />
    </VideoProvider>
  );
}
