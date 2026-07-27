import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createClient } from "@/utils/supabase/server";
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "STUDENT",
            firebaseUid: decoded.uid,
            ...(body.gender && { gender: body.gender }),
            ...(body.avatar && { avatar: body.avatar }),
          },
          emailRedirectTo: `${getRedirectUrl()}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
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
            where: { id: signUpData.user.id },
            update: {
              referralCode: generatedCode,
              referredBy,
              name,
              email,
              gender: validatedGender,
              avatar: defaultAvatarUrl,
            },
            create: {
              id: signUpData.user.id,
              email,
              name,
              role: "STUDENT",
              gender: validatedGender,
              county: "Nairobi",
              educationLevel: "HIGH_SCHOOL",
              referralCode: generatedCode,
              referredBy,
              avatar: defaultAvatarUrl,
              points: 0,
              lastActiveAt: new Date(),
            },
          });

          if (referredBy) {
            await prisma.referral.create({
              data: {
                referrerId: referredBy,
                referredId: signUpData.user.id,
                codeUsed: referralCode!.toUpperCase(),
              },
            });

            await prisma.user.update({
              where: { id: signUpData.user.id },
              data: { points: { increment: 50 } },
            });

            const { notifyUser } = await import("@/app/actions/notifications");
            await notifyUser(signUpData.user.id, {
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
          await trackAnalyticsEvent(signUpData.user.id, "signup", {
            referral_code: referralCode || null,
            referred: referredBy !== null,
          });
        } catch {
          log("warn", "Failed to track signup analytics", { userId: signUpData.user.id });
        }
      }

      if (!signUpData.session) {
        const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (pwError) throw pwError;
        return NextResponse.json({ success: true, session: pwData.session, isNew: true });
      }

      return NextResponse.json({ success: true, session: signUpData.session, isNew: true });
    }

    if (action === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role: "STUDENT", firebaseUid: decoded.uid },
            emailRedirectTo: `${getRedirectUrl()}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          try {
            await prisma.user.upsert({
              where: { id: signUpData.user.id },
              update: { name, email },
              create: {
                id: signUpData.user.id,
                email,
                name,
                role: "STUDENT",
                county: "Nairobi",
                educationLevel: "HIGH_SCHOOL",
                referralCode: generateReferralCode(name),
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

        const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (pwError) throw pwError;
        return NextResponse.json({ success: true, session: pwData.session, isNew: true });
      }

      return NextResponse.json({ success: true, session: data.session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Firebase Auth] Error:", error);
    return NextResponse.json(
      { error: error.message || "Firebase auth failed" },
      { status: 500 },
    );
  }
}
