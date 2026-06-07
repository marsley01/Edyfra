"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ShieldCheck, ChevronLeft } from "lucide-react";
import { showError, showSuccess, showUnknownError } from "@/lib/toast";
import dynamic from "next/dynamic";
import SessionReviewModal from "@/components/sessions/SessionReviewModal";
import { Z } from "@/lib/layers";

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

export default function StudyRoomClient({ initialData }: { initialData: StudyRoomInitialData }) {
  const router = useRouter();

  const [session, setSession] = useState<StudyRoomSession>(initialData.session);
  const [showReview, setShowReview] = useState(false);
  const [showNoShowPrompt, setShowNoShowPrompt] = useState(false);
  const [converting, setConverting] = useState(false);
  const currentUser = initialData.currentUser;
  const sessionId = initialData.sessionId;

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

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden font-sans">
      <header
        className="h-20 border-b border-border/50 px-8 flex items-center justify-between bg-background/80 backdrop-blur-2xl pt-[env(safe-area-inset-top,0px)]"
        style={{ zIndex: Z.STICKY }}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.back()}
            className="lg:hidden p-2 -ml-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest">{session.subject}</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {session.topic || "Study Session"}
              </p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black tracking-widest uppercase">
              {session.status === "ACTIVE" ? "Live" : session.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
          <span className="text-[9px] font-bold text-muted-foreground hidden md:block">
            {new Date().toLocaleTimeString("en-KE", {
              timeZone: "Africa/Nairobi",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            EAT
          </span>
          <div className="hidden md:flex -space-x-3">
            <AvatarPremium seed={session.student?.name} size="sm" className="border-2 border-background" />
            {session.partner && (
              <AvatarPremium seed={session.partner.name} size="sm" className="border-2 border-background" />
            )}
          </div>
          <Button
            onClick={handleEndSession}
            variant="ghost"
            className="h-10 px-6 rounded-xl border border-border/50 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            End Session
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-border/50 bg-secondary/30 hidden xl:flex flex-col p-8 space-y-8">
          <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Session Info
            </p>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Sparkles className="h-3 w-3" />{" "}
                  {session.partner ? "Studying Together" : "Waiting for a partner"}
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  {session.partner
                    ? `You're studying with ${session.partner.name}`
                    : "Hang tight — we're finding someone to join you."}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure Study Space
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  Your conversation is completely private. Just you and your study buddy. 🔒
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="p-6 rounded-[2rem] bg-primary/10 border border-primary/20 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Member Tier</p>
            <h4 className="text-xl font-black tracking-tightest">{session.tier}</h4>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-background relative">
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
          <div className="py-2 text-center border-t border-border/30">
            <span className="text-[9px] font-medium text-muted-foreground/40">
              🔒 This session is private and secure
            </span>
          </div>
        </section>
      </main>
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
