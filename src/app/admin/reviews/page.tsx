import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ReviewsModerationClient } from "./reviews-client";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "ADMIN") {
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
