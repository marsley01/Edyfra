"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

  // 1. Save the announcement record
  const announcement = await prisma.announcement.create({
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

  // 2. Fan out as individual Notification rows to all matching users
  try {
    let whereClause: any = {};
    if (data.targetAudience === "students") {
      whereClause = { role: "STUDENT" };
    } else if (data.targetAudience === "tutors") {
      whereClause = { role: "TUTOR" };
    } else if (data.targetAudience === "highschool") {
      whereClause = { educationLevel: "HIGH_SCHOOL" };
    } else if (data.targetAudience === "university") {
      whereClause = { educationLevel: "UNIVERSITY" };
    }
    // "all" = no filter

    const targetUsers = await prisma.user.findMany({
      where: Object.keys(whereClause).length ? whereClause : undefined,
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      const { notifyManyUsers } = await import("@/app/actions/notifications");
      await notifyManyUsers(
        targetUsers.map((u) => u.id),
        {
          type: "ANNOUNCEMENT",
          title: `📢 ${data.title}`,
          body: data.body,
          actionUrl: "/dashboard/notifications",
        }
      );
    }
  } catch (err) {
    console.error("Failed to fan out announcement notifications:", err);
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard/notifications");
  return { success: true, announcementId: announcement.id };
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

export async function uploadCurriculumContent(formData: FormData) {
  await guard();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const subject = formData.get("subject") as string;
  const educationLevel = formData.get("educationLevel") as string;
  const resourceType = formData.get("resourceType") as string;
  const topic = (formData.get("topic") as string) || undefined;
  const description = (formData.get("description") as string) || undefined;
  const price = Number(formData.get("price") || 0);
  const curriculumType = (formData.get("curriculumType") as string) || "";

  if (!file || !title || !subject || !educationLevel || !resourceType) {
    return { success: false, error: "Missing required fields" };
  }

  const adminClient = createAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const fileName = `curriculum/${user.id}/${Date.now()}_${safeName}`;

  let { error: uploadError } = await adminClient.storage
    .from("resources")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError?.message?.includes("bucket") || uploadError?.message?.includes("not found")) {
    await adminClient.storage.createBucket("resources", { public: true });
    const retry = await adminClient.storage.from("resources").upload(fileName, file, { cacheControl: "3600", upsert: false });
    uploadError = retry.error;
  }

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = adminClient.storage.from("resources").getPublicUrl(fileName);

  return createCurriculumResource({
    title: `${curriculumType ? `[${curriculumType}] ` : ""}${title}`,
    subject,
    educationLevel,
    resourceType,
    topic,
    description,
    price,
    filePath: publicUrl,
  });
}

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
    const rows = await prisma.resource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { id: true, name: true } } },
    });
    return rows;
  } catch (error) {
    console.error("Failed to get curriculum resources:", error);
    return [];
  }
}

export async function deleteResource(resourceId: string) {
  try {
    await guard();
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) return { success: false, error: "Resource not found" };

    if (resource.filePath) {
      try {
        const adminClient = createAdminClient();
        const url = new URL(resource.filePath);
        const marker = "/storage/v1/object/public/resources/";
        const idx = url.pathname.indexOf(marker);
        if (idx !== -1) {
          const storagePath = decodeURIComponent(url.pathname.slice(idx + marker.length));
          await adminClient.storage.from("resources").remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn("deleteResource: storage cleanup skipped:", storageErr);
      }
    }

    await prisma.resource.delete({ where: { id: resourceId } });
    revalidatePath("/admin/curriculum");
    revalidatePath("/admin/resources");
    revalidatePath("/dashboard/resources");
    return { success: true };
  } catch (error) {
    console.error("deleteResource failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete resource",
    };
  }
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
