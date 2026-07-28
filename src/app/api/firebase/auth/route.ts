import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/utils/referral";
import { log } from "@/lib/logger";

function getRedirectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  );
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Server config error: missing service role key");
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function createUserWithConfirmedEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
  name: string,
  firebaseUid: string,
  gender?: string,
  avatar?: string
) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: "STUDENT",
      firebaseUid,
      ...(gender && { gender }),
      ...(avatar && { avatar }),
    },
  });
  if (error) throw error;
  return data.user;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await verifyFirebaseToken(idToken);
    if (!decoded.valid || !decoded.email) {
      return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
    }

    const email = decoded.email;
    const password = idToken.slice(-20);
    const name = body.name || decoded.name || email.split("@")[0];

    const supabase = await createClient();

    if (action === "signup") {
      let adminClient: ReturnType<typeof createAdminClient>;
      try {
        adminClient = getAdminClient() as ReturnType<typeof createAdminClient>;
      } catch {
        return NextResponse.json({ error: "Server config error: missing service role key" }, { status: 500 });
      }

      const user = await createUserWithConfirmedEmail(
        adminClient,
        email,
        password,
        name,
        decoded.uid,
        body.gender,
        body.avatar
      );

      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (sessionError) throw sessionError;

      if (user) {
        const gender = body.gender as string | undefined;
        const avatarUrl = body.avatar as string | undefined;
        const referralCode = body.referral_code as string | undefined;
        let referredBy: string | null = null;

        const defaultAvatarUrl = avatarUrl
          ? `https://api.dicebear.com/7.x/${avatarUrl}/svg?seed=${encodeURIComponent(name)}`
          : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`;

        try {
          const generatedCode = generateReferralCode(name);

          if (referralCode) {
            const referrer = await prisma.user.findUnique({
              where: { referralCode: referralCode.toUpperCase() },
            });
            if (referrer) referredBy = referrer.id;
          }

          const allowedGenders = ["MALE", "FEMALE"] as const;
          const validatedGender = gender && allowedGenders.includes(gender as typeof allowedGenders[number])
            ? (gender as "MALE" | "FEMALE")
            : undefined;

          await prisma.user.upsert({
            where: { id: user.id },
            update: {
              referralCode: generatedCode,
              referredBy,
              name,
              email,
              gender: validatedGender,
              avatar: defaultAvatarUrl,
              firebaseUid: decoded.uid,
            },
            create: {
              id: user.id,
              email,
              name,
              role: "STUDENT",
              gender: validatedGender,
              county: "Nairobi",
              educationLevel: "HIGH_SCHOOL",
              referralCode: generatedCode,
              referredBy,
              avatar: defaultAvatarUrl,
              firebaseUid: decoded.uid,
              points: 0,
              lastActiveAt: new Date(),
            },
          });

          if (referredBy) {
            await prisma.referral.create({
              data: {
                referrerId: referredBy,
                referredId: user.id,
                codeUsed: referralCode!.toUpperCase(),
              },
            });

            await prisma.user.update({
              where: { id: user.id },
              data: { points: { increment: 50 } },
            });

            const { notifyUser } = await import("@/app/actions/notifications");
            await notifyUser(user.id, {
              type: "REFERRAL_BONUS",
              title: "Welcome! You got 50 bonus XP!",
              body: "You were referred by a friend! Enjoy 50 bonus XP to get started.",
              actionUrl: "/dashboard",
            });
          }
        } catch (dbErr) {
          log("error", "Failed to create user profile in database", {
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
          });
        }

        try {
          const { trackAnalyticsEvent } = await import("@/app/actions/analytics");
          await trackAnalyticsEvent(user.id, "signup", {
            referral_code: referralCode || null,
            referred: referredBy !== null,
          });
        } catch {
          log("warn", "Failed to track signup analytics", { userId: user.id });
        }
      }

      return NextResponse.json({ success: true, session: sessionData.session, isNew: true });
    }

    if (action === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const existingPrismaUser = await prisma.user.findUnique({
          where: { email },
          include: { studentProfile: true, tutorProfile: true }
        });

        if (existingPrismaUser) {
          if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "Server config error: missing service role key" }, { status: 500 });
          }
          const sbAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const { error: updateError } = await sbAdmin.auth.admin.updateUserById(
            existingPrismaUser.id,
            { password }
          );
          if (updateError) throw updateError;

          // Sync role to Supabase metadata
          await sbAdmin.auth.admin.updateUserById(existingPrismaUser.id, {
            user_metadata: { role: existingPrismaUser.role }
          });

          const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (pwError) throw pwError;

          const needsOnboarding = !existingPrismaUser.studentProfile && !existingPrismaUser.tutorProfile && existingPrismaUser.role === "STUDENT";
          return NextResponse.json({ success: true, session: pwData.session, isNew: needsOnboarding });
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role: "STUDENT", firebaseUid: decoded.uid },
            emailRedirectTo: `${getRedirectUrl()}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;

        let user = signUpData.user;
        let sessionData = signUpData.session;

        if (!sessionData && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { createClient: createAdminClient } = await import("@supabase/supabase-js");
          const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, role: "STUDENT", firebaseUid: decoded.uid },
          });
          if (!adminError && adminData.user) {
            user = adminData.user;
            const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({ email, password });
            if (!pwError) sessionData = pwData.session;
          }
        }

        if (!sessionData) {
          const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (pwError) throw pwError;
          sessionData = pwData.session;
        }

        if (user) {
          try {
            await prisma.user.upsert({
              where: { id: user.id },
              update: { name, email, firebaseUid: decoded.uid },
              create: {
                id: user.id,
                email,
                name,
                role: "STUDENT",
                county: "Nairobi",
                educationLevel: "HIGH_SCHOOL",
                referralCode: generateReferralCode(name),
                firebaseUid: decoded.uid,
                points: 0,
                lastActiveAt: new Date(),
              },
            });
          } catch (dbErr) {
            log("error", "Failed to create user profile on login", {
              error: dbErr instanceof Error ? dbErr.message : String(dbErr),
            });
          }
        }

        return NextResponse.json({ success: true, session: sessionData, isNew: true });
      }

      // User exists in Supabase - check if they need onboarding
      const prismaUser = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true, tutorProfile: true }
      });
      const needsOnboarding = prismaUser && !prismaUser.studentProfile && !prismaUser.tutorProfile && prismaUser.role === "STUDENT";

      // Sync role to Supabase metadata for middleware routing
      if (prismaUser && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminClient.auth.admin.updateUserById(prismaUser.id, {
          user_metadata: { role: prismaUser.role }
        });
      }

      return NextResponse.json({ success: true, session: data.session, isNew: needsOnboarding });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Firebase Auth] Error:", error);
    const message = typeof error?.message === "string" ? error.message : "An unexpected error occurred. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
