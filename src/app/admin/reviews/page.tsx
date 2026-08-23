import { redirect } from "next/navigation";
import { ReviewsModerationClient } from "./reviews-client";
import { checkAdminStatus } from "@/app/actions/admin";
import { getPendingReviews, getApprovedReviews } from "@/app/actions/reviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  // Same admin gate as the rest of /admin (env founder emails + DB ADMIN role)
  const isAdmin = await checkAdminStatus();
  if (!isAdmin) redirect("/dashboard");

  // Fetch from the same table homepage reviews are submitted to (siteTestimonial)
  const [pendingReviews, approvedReviews] = await Promise.all([
    getPendingReviews(),
    getApprovedReviews(),
  ]);

  return (
    <ReviewsModerationClient
      pendingReviews={pendingReviews}
      approvedReviews={approvedReviews}
    />
  );
}
