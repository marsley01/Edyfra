import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getSession as getMatchSession } from "@/app/actions/match";
import { getBookingSessionData } from "@/app/actions/bookings";
import StudyRoomClient, { type StudyRoomInitialData } from "./StudyRoomClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Server Component for the study room.
 *
 * Pre-fetches the session data + the current user BEFORE shipping any JS
 * to the client. The client wrapper receives the data as props and renders
 * immediately, eliminating the 1–2s "Loader2 flicker" the previous
 * client-mounted version produced.
 */
export default async function StudyRoomPage({ params }: PageProps) {
  const { id: sessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let session: any = await getMatchSession(sessionId);
  if (!session) {
    session = await getBookingSessionData(sessionId);
  }

  if (!session) {
    return <StudyRoomNotFound />;
  }

  const initialData: StudyRoomInitialData = {
    sessionId,
    session: {
      id: session.id,
      tier: session.tier,
      subject: session.subject,
      topic: session.topic,
      status: session.status,
      studentId: session.studentId,
      partnerId: session.partnerId,
      student: {
        name: session.student?.name || "Student",
        avatar: session.student?.avatar || undefined,
      },
      partner: session.partner
        ? {
            name: session.partner.name,
            avatar: session.partner.avatar || undefined,
          }
        : undefined,
    },
    currentUser: {
      id: user.id,
      name:
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User",
      avatar: user.user_metadata?.avatar || undefined,
    },
  };

  return <StudyRoomClient initialData={initialData} />;
}

function StudyRoomNotFound() {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center space-y-4 bg-background">
      <p className="text-sm font-black uppercase tracking-widest text-foreground">
        Session not found
      </p>
      <p className="text-xs text-muted-foreground max-w-sm text-center">
        This study room doesn&apos;t exist or you don&apos;t have access to it.
      </p>
    </div>
  );
}
