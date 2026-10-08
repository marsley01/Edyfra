import { CommunityHub } from "@/components/community/CommunityHub";

type SP = Promise<{ view?: string | string[]; topic?: string | string[]; subject?: string | string[] }>;

export default async function TutorCommunityPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  // ?topic=<id> is the forum deep link used by reply notifications.
  const view = sp.view === "discussions" || typeof sp.topic === "string" ? "discussions" : "feed";
  const subject = typeof sp.subject === "string" && sp.subject.trim() ? sp.subject.trim().slice(0, 60) : null;
  return <CommunityHub role="tutor" basePath="/tutor/community" initialView={view} initialSubject={subject} />;
}
