import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ReviewsModerationClient } from "./reviews-client";
import prisma from "@/lib/prisma";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const dbUser = user ? await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : [])
      ]
    },
    select: { role: true }
  }) : null;

  if (!user || dbUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all reviews (pending + approved)
  const { data: pending } = await supabase
    .from("reviews")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  const { data: approved } = await supabase
    .from("reviews")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  return (
    <ReviewsModerationClient
      pendingReviews={pending || []}
      approvedReviews={approved || []}
    />
  );
}
