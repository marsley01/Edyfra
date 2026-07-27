import { NextRequest, NextResponse } from "next/server";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/utils/referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password, displayName, idToken } = body;

    if (action === "signup") {
      const firebaseAuth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const supabase = await createClient();
      const { data: sbUser, error: sbError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { name: displayName || email.split("@")[0], role: "STUDENT", firebaseUid: cred.user.uid },
        },
      });
      if (sbError) throw sbError;
      return NextResponse.json({ success: true, firebaseUid: cred.user.uid, userId: sbUser.user?.id });
    }

    if (action === "login" && idToken) {
      const decoded = await verifyFirebaseToken(idToken);
      if (!decoded.valid) {
        return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
      }

      const supabase = await createClient();

      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: decoded.email!,
          password: idToken.slice(-20),
        });
        if (error) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: decoded.email!,
            password: idToken.slice(-20),
            options: {
              data: { name: decoded.name || decoded.email!.split("@")[0], role: "STUDENT", firebaseUid: decoded.uid },
            },
          });
          if (signUpError) throw signUpError;

          await prisma.user.upsert({
            where: { id: signUpData.user!.id },
            update: {},
            create: {
              id: signUpData.user!.id,
              email: decoded.email!,
              name: decoded.name || decoded.email!.split("@")[0],
              role: "STUDENT",
              county: "Nairobi",
              educationLevel: "HIGH_SCHOOL",
              referralCode: generateReferralCode(decoded.name || decoded.email!.split("@")[0]),
            },
          });

          return NextResponse.json({ success: true, user: signUpData.user, session: signUpData.session, isNew: true });
        }
        return NextResponse.json({ success: true, user: data.user, session: data.session });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "login" && email && password) {
      const firebaseAuth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await cred.user.getIdToken();
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: "firebase", token });
      if (error) {
        const { data: pwData, error: pwError } = await supabase.auth.signInWithPassword({ email, password });
        if (pwError) throw pwError;
        return NextResponse.json({ success: true, user: pwData.user, session: pwData.session });
      }
      return NextResponse.json({ success: true, user: data.user, session: data.session });
    }

    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  } catch (error: any) {
    console.error("[Firebase Auth] Error:", error);
    return NextResponse.json({ error: error.message || "Firebase auth failed" }, { status: 500 });
  }
}
