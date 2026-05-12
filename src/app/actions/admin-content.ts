"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isFounderEmail } from "@/utils/admin-guard";

async function guard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (isFounderEmail(user.email)) return;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (dbUser?.role !== "ADMIN") throw new Error("Unauthorized");
}

// --- REPORTS / MODERATION ---
export async function getReports() {
  await guard();
  try {
    return await prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  } catch (error) {
    console.error("Failed to get reports:", error);
    return [];
  }
}

export async function dismissReport(reportId: string) {
  await guard();
  await prisma.report.update({ where: { id: reportId }, data: { status: "dismissed" } });
  revalidatePath("/admin/moderation");
}

export async function actionReport(reportId: string, action: "warn" | "suspend" | "ban") {
  await guard();
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Report not found");
  await prisma.report.update({ where: { id: reportId }, data: { status: "actioned" } });
  if (action === "suspend") await prisma.user.update({ where: { id: report.reportedUserId }, data: { suspended: true } });
  if (action === "ban") await prisma.user.update({ where: { id: report.reportedUserId }, data: { banned: true } });
  revalidatePath("/admin/moderation");
}

// --- ANNOUNCEMENTS ---
export async function getAnnouncements() {
  await guard();
  try {
    return await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to get announcements:", error);
    return [];
  }
}

export async function createAnnouncement(data: { title: string; body: string; targetAudience: string; expiresAt?: string }) {
  await guard();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      targetAudience: data.targetAudience,
      publishedAt: new Date(),
      isActive: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: user?.id,
    },
  });
  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(id: string) {
  await guard();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin/announcements");
}

// --- NEWS ARTICLES ---
export async function getNewsArticles() {
  await guard();
  try {
    return await prisma.newsArticle.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to get news articles:", error);
    return [];
  }
}

export async function createNewsArticle(data: { title: string; slug: string; category: string; body: string; coverImage?: string; summary?: string; publish: boolean }) {
  await guard();
  await prisma.newsArticle.create({
    data: {
      title: data.title,
      slug: data.slug,
      category: data.category,
      body: data.body,
      coverImage: data.coverImage,
      summary: data.summary,
      publishedAt: data.publish ? new Date() : null,
      isDraft: !data.publish,
    },
  });
  revalidatePath("/admin/news");
}

export async function deleteNewsArticle(id: string) {
  await guard();
  await prisma.newsArticle.delete({ where: { id } });
  revalidatePath("/admin/news");
}

// --- TESTIMONIALS ---
export async function getTestimonials() {
  await guard();
  try {
    return await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.error("Failed to get testimonials:", error);
    return [];
  }
}

export async function approveTestimonial(id: string) {
  await guard();
  await prisma.testimonial.update({ where: { id }, data: { isApproved: true } });
  revalidatePath("/admin/testimonials");
}

export async function rejectTestimonial(id: string) {
  await guard();
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
}

// --- CURRICULUM CONTENT (KICD/KLB & PAST PAPERS) ---

export async function createCurriculumResource(data: {
  title: string;
  subject: string;
  educationLevel: string;
  resourceType: string;
  topic?: string;
  description?: string;
  price?: number;
  filePath: string;
}) {
  await guard();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const resource = await prisma.resource.create({
    data: {
      sellerId: user!.id,
      title: data.title,
      subject: data.subject,
      educationLevel: data.educationLevel,
      resourceType: data.resourceType,
      topic: data.topic || null,
      description: data.description || null,
      price: data.price || 0,
      filePath: data.filePath,
      status: "approved", // Admin content is immediately approved
    },
  });

  revalidatePath("/admin/curriculum");
  revalidatePath("/dashboard/resources");
  return { success: true, resource };
}

export async function getAllCurriculumResources(type?: string) {
  await guard();
  try {
    const where: any = {};
    if (type) where.resourceType = type;
    return await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { id: true, name: true } } },
    });
  } catch (error) {
    console.error("Failed to get curriculum resources:", error);
    return [];
  }
}

export async function deleteResource(resourceId: string) {
  await guard();
  await prisma.resource.delete({ where: { id: resourceId } });
  revalidatePath("/admin/curriculum");
  revalidatePath("/admin/resources");
}

// --- NOTIFICATION SETTINGS ---
export async function getNotificationSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.notificationSettings.findUnique({ where: { userId: user.id } });
}

export async function getUserPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.userPreferences.findUnique({ where: { userId: user.id } });
}
