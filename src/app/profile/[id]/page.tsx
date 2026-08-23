import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfile } from "@/app/actions/profile";
import { ProfileView } from "@/components/profile/profile-view";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getProfile(id);
  if (!result) return { title: "Profile not found — Edyfra" };
  return {
    title: `${result.profile.name} (@${result.profile.username}) — Edyfra`,
    description:
      result.profile.bio ||
      `${result.profile.name} on Edyfra — ${result.profile.county}, studying ${result.profile.subjects.slice(0, 3).join(", ") || "on Edyfra"}.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const result = await getProfile(id);
  if (!result) notFound();

  return <ProfileView profile={result.profile} viewer={result.viewer} />;
}
