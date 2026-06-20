"use client";

import { CommunityForum } from "@/components/community/CommunityForum";

export default function StudentCommunityPage() {
  return <CommunityForum role="student" basePath="/dashboard/community" />;
}
