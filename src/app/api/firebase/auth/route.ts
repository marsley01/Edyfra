import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/utils/referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, idToken } = body;

    if (action === "login" && idToken) {
      const decoded = await verifyFirebaseToken(idToken);
      if (!decoded.valid) {
        return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
      }

      const supabase = await createClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();

      if (!sbUser) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "firebase",
          token: idToken,
        });

        if (error || !data.user) {
          const { data: pwData, error: pwError } = await supabase.auth.signUp({
            email: decoded.email!,
            password: idToken.slice(-20),
            options: {
              data: {
                name: decoded.name || decoded.email!.split("@")[0],
                role: "STUDENT",
                firebaseUid: decoded.uid,
              },
            },
          });
          if (pwError) throw pwError;

          await prisma.user.upsert({
            where: { id: pwData.user!.id },
            update: {},
            create: {
              id: pwData.user!.id,
              email: decoded.email!,
              name: decoded.name || decoded.email!.split("@")[0],
              role: "STUDENT",
              county: "Nairobi",
              educationLevel: "HIGH_SCHOOL",
              referralCode: generateReferralCode(decoded.name || decoded.email!.split("@")[0]),
            },
          });

          return NextResponse.json({
            success: true,
            user: pwData.user,
            session: pwData.session,
            isNew: true,
          });
        }

        return NextResponse.json({ success: true, user: data.user, session: data.session });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  } catch (error: any) {
    console.error("[Firebase Auth] Error:", error);
    return NextResponse.json({ error: error.message || "Firebase auth failed" }, { status: 500 });
  }
}
