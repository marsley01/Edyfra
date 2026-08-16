"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  institutionName: z.string().min(2, "Institution name must be at least 2 characters"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function submitInstitutionApplication(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    institutionName: formData.get("institutionName") as string,
    phone: formData.get("phone") as string || undefined,
    message: formData.get("message") as string || undefined,
  };

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const existing = await prisma.institutionApplication.findFirst({
    where: {
      email: parsed.data.email.toLowerCase(),
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (existing) {
    return {
      error:
        existing.status === "APPROVED"
          ? "This email is already associated with an approved institution."
          : "An application with this email is already pending review.",
    };
  }

  await prisma.institutionApplication.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      institutionName: parsed.data.institutionName,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
    },
  });

  revalidatePath("/institution/apply");
  return { success: true };
}

export async function getInstitutionApplications(status?: string) {
  const where = status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {};
  return prisma.institutionApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { name: true, email: true } } },
  });
}

export async function reviewInstitutionApplication(
  applicationId: string,
  action: "APPROVED" | "REJECTED",
  adminNotes?: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const app = await prisma.institutionApplication.findUnique({
    where: { id: applicationId },
  });
  if (!app || app.status !== "PENDING") {
    return { error: "Application not found or already reviewed" };
  }

  if (action === "APPROVED") {
    const institution = await prisma.institution.create({
      data: {
        name: app.institutionName,
        email: app.email,
        code: app.institutionName.substring(0, 4).toUpperCase() + Date.now().toString(36).toUpperCase(),
      },
    });

    await prisma.institutionStaff.create({
      data: {
        institutionId: institution.id,
        name: app.name,
        email: app.email,
        userId: null,
      },
    });

    await prisma.institutionApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        adminNotes: adminNotes || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
  } else {
    await prisma.institutionApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        adminNotes: adminNotes || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
  }

  revalidatePath("/admin/institutions");
  return { success: true };
}

export async function institutionLogin(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if user is institution staff
  const staff = await prisma.institutionStaff.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!staff) {
    await supabase.auth.signOut();
    return { error: "You are not an authorized institution staff member." };
  }

  revalidatePath("/", "layout");
  // Return the target so the client form can navigate. Using `redirect()` here
  // would throw NEXT_REDIRECT inside the client's try/catch and get swallowed
  // as an error.
  return { redirectTo: "/institution/dashboard" };
}
