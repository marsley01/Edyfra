import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { EduLevel, Role, Tier } from "@/generated/client";
import { SESSION_CONFIG } from "@/lib/config";
import { sanitizeNextPath } from "@/lib/google-auth";
import prisma from "@/lib/prisma";
import { generateReferralCode } from "@/utils/referral";

/**
 * PKCE landing route for every Supabase redirect: Google sign-in, magic links
 * and password recovery all come back here with a one-time `code` (or an
 * `error` when the user declines). The code is exchanged server-side so the
 * session cookies are written by the same response that performs the redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (!code) {
    const description = searchParams.get("error_description");
    const errorCode = searchParams.get("error_code") || searchParams.get("error");
    return redirectToLogin(request, errorCode, description);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 302);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] code exchange failed:", error.message);
    return redirectToLogin(request, "exchange_code_failed", error.message);
  }

  // A first-time Google sign-in produces a Supabase user but no Prisma row, so
  // every server action that reads the database would treat the account as a
  // ghost until onboarding ran. Materialise the row here — after the password
  // reset link reuse case has been ruled out below — so a new account is usable
  // straight away and can finish setup later from /dashboard/settings.
  if (!isRecovery(request)) {
    await ensurePrismaUser(data.user);
  }

  return response;
}

/**
 * A password-recovery redirect carries `type=recovery`; re-creating the Prisma
 * row during that flow would be pointless work at best.
 */
function isRecovery(request: NextRequest): boolean {
  return (
    request.nextUrl.searchParams.get("type") === "recovery" ||
    request.nextUrl.searchParams.get("error_code") === "otp_expired"
  );
}

async function ensurePrismaUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
): Promise<void> {
  if (!user) return;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) return;

    const metadata = user.user_metadata ?? {};
    const name =
      (typeof metadata.name === "string" && metadata.name) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (user.email ? user.email.split("@")[0] : null) ||
      "New User";

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email || `${user.id}@placeholder.edyfra.com`,
        name,
        role: Role.STUDENT,
        educationLevel: EduLevel.HIGH_SCHOOL,
        county: "Nairobi",
        tier: Tier.BRONZE,
        avatar: typeof metadata.avatar === "string" ? metadata.avatar : null,
        referralCode: generateReferralCode(name),
        points: SESSION_CONFIG.NEW_USER_WELCOME_BONUS,
      },
    });
  } catch (error) {
    // Never block a successful sign-in on bookkeeping. The row heals on the
    // first getUserData()/updateUserRole() call if this write lost a race.
    console.error("[auth/callback] failed to materialise Prisma user:", error);
  }
}

function redirectToLogin(
  request: NextRequest,
  code: string | null,
  description: string | null,
): NextResponse {
  if (description) {
    console.warn(`[auth/callback] ${code ?? "no_error_code"}: ${description}`);
  }
  const url = new URL("/auth/login", request.url);
  if (code) url.searchParams.set("error", code);
  return NextResponse.redirect(url, 302);
}
