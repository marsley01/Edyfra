"use server";

import { createClient } from "@/utils/supabase/server";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export interface Review {
  id: string;
  author_name: string;
  school: string;
  quote: string;
  approved: boolean;
  created_at: string;
}

export async function submitReview(data: {
  author_name: string;
  school: string;
  quote: string;
}) {
  const supabase = await createClient();

  if (!data.author_name?.trim() || !data.quote?.trim()) {
    return { error: "Name and review are required." };
  }
  if (data.quote.length < 20) {
    return { error: "Review must be at least 20 characters." };
  }
  if (data.quote.length > 500) {
    return { error: "Review must be under 500 characters." };
  }

  const { error } = await supabase.from("reviews").insert({
    author_name: data.author_name.trim(),
    school: data.school?.trim() || "Edyfra Scholar",
    quote: data.quote.trim(),
    approved: false, // Goes to moderation queue
  });

  if (error) {
    console.error("Review submission error:", error);
    return { error: "Failed to submit review. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getApprovedReviews(): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data;
}

export async function getPendingReviews(): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function approveReview(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  await supabase.from("reviews").update({ approved: true }).eq("id", id);
  revalidatePath("/");
  return { success: true };
}

export async function deleteReview(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }
  await supabase.from("reviews").delete().eq("id", id);
  revalidatePath("/");
  return { success: true };
}
