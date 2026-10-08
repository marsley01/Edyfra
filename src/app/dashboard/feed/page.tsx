import { CommunityFeed } from "@/components/community/CommunityFeed";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ topic?: string | string[] }> }) {
  const { topic } = await searchParams;
  const t = typeof topic === "string" && topic.trim() ? topic.trim().slice(0, 60) : null;
  return <CommunityFeed initialTopic={t} />;
}
