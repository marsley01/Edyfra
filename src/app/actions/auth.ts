"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserData } from "./user";
import { notifyUser } from "./notifications";
import { generateReferralCode } from "@/utils/referral";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function login(formData: FormData) {
  const headers = await (await import('next/headers')).headers();
  const ip = headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(`login:${ip}`)) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const code = formData.get("code") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // FORCE SYNC: Ensure Prisma has this user record immediately on login
  const prismaUser = await getUserData();
  
  const role = prismaUser?.role || "STUDENT";
  
  // Keep Supabase metadata aligned with Prisma so middleware/layout routing doesn't mis-route users.
  try {
    const currentMetaRole = (data.user?.user_metadata?.role || "").toUpperCase();
    const desiredRole = (role || "STUDENT").toUpperCase();
    if (currentMetaRole !== desiredRole) {
      await supabase.auth.updateUser({ data: { role: desiredRole } });
    }
  } catch (e) {
    console.error("Role metadata sync failed:", e);
  }

  revalidatePath("/", "layout");

  let redirectTo = "/dashboard";

  // Institution logic: If user has an active institution membership, redirect to institution portal.
  if (prismaUser) {
    try {
      const membership = await prisma.institutionMember.findFirst({
        where: {
          userId: prismaUser.id,
          status: "ACTIVE",
        },
        include: { institution: true },
      });
      // If they are institution staff, default to routing them to the institution portal
      if (membership && ["INSTITUTION_ADMIN", "INSTITUTION_DEPUTY", "INSTITUTION_TEACHER"].includes(membership.role)) {
        return { redirectTo: "/institution/dashboard" };
      }
    } catch (e) {
      console.error("Institution membership check failed:", e);
      // Fall through to normal redirect if institution check fails
    }
  }
  
  if (role === "TUTOR") {
    redirectTo = "/tutor";
  } else if (role === "ADMIN") {
    redirectTo = "/admin";
  }

  return { redirectTo };
}

// generateReferralCode is now imported from @/utils/referral

export async function signup(formData: FormData) {
  const headers = await (await import('next/headers')).headers();
  const ip = headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(`signup:${ip}`)) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "Password must contain at least one uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "Password must contain at least one number." };
  }
  const name = formData.get("name") as string;
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
        name: name,
        role: "STUDENT",
        gender,
        avatar: avatarUrl,
        referral_code: referralCode || null,
      },
      // VERCEL_URL is injected automatically by Vercel deployments — use it as
      // a fallback so signup emails work even when NEXT_PUBLIC_SITE_URL is not
      // explicitly configured in the production environment.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create the user in Prisma and handle referral
  if (data.user) {
    const generatedCode = generateReferralCode(name);
    let referredBy: string | null = null;

    // Check if referral code was provided
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (referrer) {
        referredBy = referrer.id;
      }
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        referralCode: generatedCode,
        referredBy,
        name,
        email,
        gender: gender as any,
        avatar: avatarUrl,
      },
      create: {
        id: data.user.id,
        email,
        name,
        role: "STUDENT",
        gender: gender as any,
        county: "Nairobi",
        educationLevel: "HIGH_SCHOOL",
        referralCode: generatedCode,
        referredBy,
        avatar: avatarUrl,
        points: 0,
        lastActiveAt: new Date(),
      },
    });

    // Create referral record if referred
    if (referredBy) {
      await prisma.referral.create({
        data: {
          referrerId: referredBy,
          referredId: data.user.id,
          codeUsed: referralCode!.toUpperCase(),
        },
      });

      // Award 50 bonus XP to the new user immediately
      await prisma.user.update({
        where: { id: data.user.id },
        data: { points: { increment: 50 } },
      });

      await notifyUser(data.user.id, {
        type: "REFERRAL_BONUS",
        title: "🎉 Welcome! You got 50 bonus XP!",
        body: "You were referred by a friend! Enjoy 50 bonus XP to get started.",
        actionUrl: "/dashboard",
      });
    }

    // Track signup analytics
    try {
      const { trackAnalyticsEvent } = await import("./analytics");
      await trackAnalyticsEvent(data.user.id, "signup", {
        referral_code: referralCode || null,
        referred: referredBy !== null,
      });
    } catch {}
  }

  if (!data.session) {
    return { success: true, message: "Account created! Check your email to confirm before continuing." };
  }

  revalidatePath("/", "layout");
  return { redirectTo: "/onboarding" };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { redirectTo: "/login" };
}
