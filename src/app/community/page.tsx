import type { Metadata } from "next";
import { getPublicCommunitySnapshot } from "@/app/actions/forum";
import { CommunityLanding } from "./community-landing";

export const metadata: Metadata = {
  title: "Community — Edyfra",
  description: "Kenyan students and tutors asking questions, sharing wins and studying together on Edyfra.",
};

// Snapshot is cached for 2 minutes inside the action.
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const snapshot = await getPublicCommunitySnapshot();
  return <CommunityLanding snapshot={snapshot} />;
}
