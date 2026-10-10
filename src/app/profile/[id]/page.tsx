import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/app/actions/profile";
import { getFeedPage, getPost } from "@/app/actions/feed";
import { ProfileView } from "@/components/profile/profile-view";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ post?: string | string[] }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProfile(id);
  if (!result) return { title: "Profile not found — Edyfra" };
  const { profile } = result;
  const handle = profile.username ? ` (@${profile.username})` : "";
  const subjects = (profile.role === "TUTOR" ? profile.tutorSubjects : profile.subjects).slice(0, 3).join(", ");
  return {
    title: `${profile.name}${handle} — Edyfra`,
    description: profile.bio || `${profile.name} on Edyfra — ${profile.county}${subjects ? `, ${subjects}` : ""}.`,
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const postId = typeof sp.post === "string" ? sp.post : null;

  const [result, firstPage, linkedPost] = await Promise.all([
    getProfile(id),
    getFeedPage({ authorId: id }),
    postId ? getPost(postId) : Promise.resolve(null),
  ]);
  if (!result) notFound();

  return (
    <ProfileView
      key={id}
      profile={result.profile}
      viewer={result.viewer}
      initialPosts={firstPage.posts}
      initialCursor={firstPage.nextCursor}
      feedViewer={firstPage.viewer}
      linkedPost={linkedPost && linkedPost.author.id === id ? linkedPost : null}
    />
  );
}
