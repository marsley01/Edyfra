"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import { notifyUser } from "./notifications";
import { generateReferralCode } from "@/utils/referral";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import { log } from "@/lib/logger";

function getRedirectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const prismaUser = await getUserData();
  const role = prismaUser?.role || "STUDENT";

  try {
    const currentMetaRole = (data.user?.user_metadata?.role || "").toUpperCase();
    const desiredRole = role.toUpperCase();
    if (currentMetaRole !== desiredRole) {
      await supabase.auth.updateUser({ data: { role: desiredRole } });
    }
  } catch (e) {
    log("error", "Role metadata sync failed", { userId: data.user?.id, error: String(e) });
  }

  revalidatePath("/", "layout");

  let redirectTo = "/dashboard";

  if (prismaUser) {
    try {
      const membership = await prisma.institutionMember.findFirst({
        where: {
          userId: prismaUser.id,
          status: "ACTIVE",
        },
        include: { institution: true },
      });
      if (membership && ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY", "INSTITUTION_TEACHER"].includes(membership.role)) {
        return { redirectTo: "/institution/dashboard" };
      }
    } catch (e) {
      log("warn", "Institution membership check failed", { userId: prismaUser.id, error: String(e) });
    }
  }

  if (role === "TUTOR") {
    redirectTo = "/tutor";
  } else if (role === "ADMIN") {
    redirectTo = "/admin";
  }

  return { redirectTo };
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "student",
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const supabase = await createClient();

  const { name, email, password } = parsed.data;
  const gender = formData.get("gender") as string;
  const customAvatarUrl = formData.get("avatarUrl") as string;
  const avatarStyle = formData.get("avatar") as string;
  const referralCode = formData.get("referral_code") as string;

  const defaultAvatarUrl = avatarStyle
    ? `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(name || email)}`
    : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name || email)}`;

  const avatarUrl = customAvatarUrl || defaultAvatarUrl;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "STUDENT",
        gender,
        avatar: avatarUrl,
        referral_code: referralCode || null,
      },
      emailRedirectTo: `${getRedirectUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const generatedCode = generateReferralCode(name);
    let referredBy: string | null = null;

    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    const allowedGenders = ["MALE", "FEMALE"] as const;
    const validatedGender = allowedGenders.includes(gender as typeof allowedGenders[number])
      ? (gender as "MALE" | "FEMALE")
      : undefined;

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        referralCode: generatedCode,
        referredBy,
        name,
        email,
        gender: validatedGender,
        avatar: avatarUrl,
      },
      create: {
        id: data.user.id,
        email,
        name,
        role: "STUDENT",
        gender: validatedGender,
        county: "Nairobi",
        educationLevel: "HIGH_SCHOOL",
        referralCode: generatedCode,
        referredBy,
        avatar: avatarUrl,
        points: 0,
        lastActiveAt: new Date(),
      },
    });

    if (referredBy) {
      await prisma.referral.create({
        data: {
          referrerId: referredBy,
          referredId: data.user.id,
          codeUsed: referralCode!.toUpperCase(),
        },
      });

      await prisma.user.update({
        where: { id: data.user.id },
        data: { points: { increment: 50 } },
      });

      await notifyUser(data.user.id, {
        type: "REFERRAL_BONUS",
        title: "Welcome! You got 50 bonus XP!",
        body: "You were referred by a friend! Enjoy 50 bonus XP to get started.",
        actionUrl: "/dashboard",
      });
    }

    try {
      const { trackAnalyticsEvent } = await import("./analytics");
      await trackAnalyticsEvent(data.user.id, "signup", {
        referral_code: referralCode || null,
        referred: referredBy !== null,
      });
    } catch {
      log("warn", "Failed to track signup analytics", { userId: data.user.id });
    }
  }

  if (!data.session) {
    return {
      success: true,
      message: "Account created! Check your email to confirm before continuing.",
    };
  }

  revalidatePath("/", "layout");
  return { redirectTo: "/onboarding" };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { redirectTo: "/login" };
}
