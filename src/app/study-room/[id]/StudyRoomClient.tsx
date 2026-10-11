"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Loader2, ChevronLeft, Clock, GraduationCap, ShieldCheck, LogOut, Sparkles } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import dynamic from "next/dynamic";
import SessionReviewModal from "@/components/sessions/SessionReviewModal";
import { Z } from "@/lib/layers";
import { motion, AnimatePresence } from "framer-motion";
import { VideoProvider } from "@/components/video/VideoProvider";
import { StartCallButton } from "@/components/video/StartCallButton";

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
  /** True when this room is a scheduled booking (bookings table), not a matched Session */
  isBooking?: boolean;
  session: StudyRoomSession;
  currentUser: { id: string; name?: string; avatar?: string };
}

/**
 * Whether the other participant is connected to chat right now, from Stream
 * presence. The room used to draw a green dot for everyone, so a partner who
 * had never opened the room still looked online. Returns null while unknown.
 */
function usePartnerOnline(partnerId: string | null | undefined): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    if (!partnerId || partnerId === "mash-ai") return;
    let active = true;
    let unsub: { unsubscribe: () => void } | null = null;
    const check = async () => {
      try {
        const { StreamChat } = await import("stream-chat");
        const { STREAM_KEY } = await import("@/components/stream/styles/constants");
        const client = StreamChat.getInstance(STREAM_KEY);
        if (!client.userID) return; // chat not connected yet; try next tick
        if (!unsub) {
          unsub = client.on("user.presence.changed", (e: any) => {
            if (active && e.user?.id === partnerId) setOnline(!!e.user.online);
          });
        }
        const { users } = await client.queryUsers({ id: { $eq: partnerId } }, {}, { presence: true });
        if (active) setOnline(!!users[0]?.online);
      } catch {
        /* presence is best-effort */
      }
    };
    void check();
    const t = setInterval(check, 15_000);
    return () => {
      active = false;
      clearInterval(t);
      unsub?.unsubscribe();
    };
  }, [partnerId]);
  return online;
}

function StudyRoomInner({ initialData }: { initialData: StudyRoomInitialData }) {
  const router = useRouter();
  const [session, setSession] = useState<StudyRoomSession>(initialData.session);
  const [showReview, setShowReview] = useState(false);
  const [showNoShowPrompt, setShowNoShowPrompt] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [partnerEnded, setPartnerEnded] = useState(false);
  const currentUser = initialData.currentUser;
  const sessionId = initialData.sessionId;
  const isMashSession = session.tier === "MASH" || session.partnerId === "mash-ai";
  const otherUserId = session.studentId === currentUser.id ? session.partnerId : session.studentId;
  const partnerOnline = usePartnerOnline(isMashSession ? null : otherUserId);

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

  // When the tutor opens a confirmed booking's room, mark it active (this also
  // notifies the student that the session has started).
  useEffect(() => {
    if (!initialData.isBooking) return;
    // getBookingSessionData reports a "confirmed" booking as status "ACTIVE"
    if (initialData.session.partnerId !== currentUser.id || initialData.session.status !== "ACTIVE") return;
    (async () => {
      try {
        const { updateBookingStatus } = await import("@/app/actions/bookings");
        await updateBookingStatus(sessionId, "active");
      } catch (err) {
        console.warn("[StudyRoom] could not mark booking active:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tutor no-show: after 5 minutes, if the tutor still isn't connected, offer
  // the student a way forward. The prompt state existed but was never shown.
  useEffect(() => {
    if (session.tier !== "TUTOR" || session.studentId !== currentUser?.id) return;
    const timer = setTimeout(() => setShowNoShowPrompt(true), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [session.tier, session.studentId, currentUser?.id]);
  useEffect(() => {
    if (partnerOnline) setShowNoShowPrompt(false);
  }, [partnerOnline]);

  // Keep the room in sync: a partner arriving, or the other person ending the
  // session. Mash sessions have no human partner to wait for, so they used to
  // poll forever while showing "Waiting for someone".
  useEffect(() => {
    if (isMashSession) return;
    const interval = setInterval(fetchSession, session?.partnerId ? 15000 : 10000);
    return () => clearInterval(interval);
  }, [session?.partnerId, fetchSession, isMashSession]);

  useEffect(() => {
    if (session.status === "COMPLETED" && !isEnding) setPartnerEnded(true);
  }, [session.status, isEnding]);

  const handleEndSession = async () => {
    if (!session || isEnding) return;
    setIsEnding(true);
    setShowLeaveConfirm(false);
    try {
      let result: { pointsAwarded?: number } | undefined;
      if (initialData.isBooking) {
        // Booking rooms have no Session row, so completeSession was a no-op and
        // the booking stayed "confirmed" forever. The tutor closes it out
        // (confirmed -> active -> completed are the only valid transitions).
        if (session.partnerId === currentUser.id) {
          const { updateBookingStatus } = await import("@/app/actions/bookings");
          await updateBookingStatus(sessionId, "active").catch(() => {});
          await updateBookingStatus(sessionId, "completed");
        }
      } else {
        const { completeSession } = await import("@/app/actions/match");
        result = await completeSession(sessionId);
      }

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
    } catch (err) {
      console.error("[StudyRoom] handleEndSession error:", err);
      showError({ title: "Couldn't end session", cause: "Something went wrong.", fix: "You've been redirected out." });
      router.push("/dashboard");
    } finally {
      setIsEnding(false);
    }
  };

  // Stepping out leaves the session open, so the other person can carry on and
  // you can come back. "Leave" used to complete the session for both people,
  // which also blocked any further video call between them.
  const handleStepOut = () => {
    setShowLeaveConfirm(false);
    router.push("/dashboard");
  };

  const handleReviewClose = () => {
    setShowReview(false);
    router.push("/dashboard");
  };

  const participants = [
    { ...session.student, isCurrentUser: session.studentId === currentUser.id, role: session.tier === "TUTOR" ? "Student" : "You" },
    ...(session.partner ? [{ ...session.partner, isCurrentUser: session.partnerId === currentUser.id, role: session.tier === "TUTOR" ? "Tutor" : "Buddy" }] : []),
  ];

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Full-screen ending overlay */}
      <AnimatePresence>
        {isEnding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Ending session…</p>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                        p.isCurrentUser || partnerOnline ? "bg-emerald-500" : partnerOnline === false ? "bg-muted-foreground/40" : "bg-amber-400"
                      }`}
                      title={p.isCurrentUser ? "You" : partnerOnline ? "In the room" : partnerOnline === false ? "Not in the room right now" : "Checking..."}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {p.name}{p.isCurrentUser ? " (you)" : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.role}
                      {!p.isCurrentUser && partnerOnline === false ? " · not here yet" : ""}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isMashSession && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">Mash AI</p>
                    <p className="text-[11px] text-muted-foreground">Replies to every message here</p>
                  </div>
                </div>
              )}
              {!session.partner && !isMashSession && (
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
          {/* Incoming rings and the in-call UI are rendered by VideoProvider */}
          {session.partnerId && session.partnerId !== "mash-ai" && (
            <div className="px-4 pt-3 pb-1 flex justify-end shrink-0">
              <StartCallButton
                roomId={sessionId}
                subject={`${session.subject}${session.topic ? ` — ${session.topic}` : ""}`}
                otherUserId={
                  session.studentId === currentUser.id
                    ? session.partnerId
                    : session.studentId
                }
                otherUserName={
                  session.studentId === currentUser.id
                    ? session.partner?.name || "Buddy"
                    : session.student?.name || "Buddy"
                }
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
                memberIds={
                  session.studentId === currentUser.id
                    ? session.partnerId ? [session.partnerId] : []
                    : [session.studentId]
                }
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
                  {isMashSession
                    ? "Your chat with Mash is saved."
                    : "Step out to keep the session open for your partner, or end it for both of you."}
                </p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={handleEndSession}
                  disabled={isEnding}
                  className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[15px] font-medium transition-all disabled:opacity-60"
                >
                  {isEnding ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ending…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      {isMashSession ? "End session" : "End session for both"}
                    </span>
                  )}
                </Button>
                {!isMashSession && (
                  <Button
                    variant="outline"
                    onClick={handleStepOut}
                    disabled={isEnding}
                    className="w-full h-12 rounded-xl text-[15px] font-medium disabled:opacity-40"
                  >
                    Step out (keep it open)
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={isEnding}
                  className="w-full h-12 rounded-xl text-[15px] font-medium text-foreground disabled:opacity-40"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(partnerEnded || (showNoShowPrompt && !partnerOnline)) && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 flex justify-center p-4"
            style={{ zIndex: Z.STICKY + 5 }}
            role="status"
          >
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-3">
              <p className="text-[15px] font-semibold">
                {partnerEnded ? "This session has ended" : "Your tutor hasn't joined yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {partnerEnded
                  ? "The other person ended the session. Your chat is saved."
                  : "Ask @Mash in the chat while you wait, or end the session and start a new search."}
              </p>
              <div className="flex gap-2">
                {partnerEnded ? (
                  <Button onClick={() => router.push("/dashboard")} className="rounded-xl">Back to dashboard</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowNoShowPrompt(false)} className="rounded-xl">Keep waiting</Button>
                    <Button onClick={handleEndSession} className="rounded-xl">End session</Button>
                  </>
                )}
              </div>
            </div>
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
