import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * PYTHON_BACKEND_URL must be set in production.
 * Local dev falls back to 127.0.0.1:8000 (run: npm run dev:python).
 * Set this in Vercel Dashboard → Settings → Environment Variables
 * Value: the Railway service URL, e.g. https://edyfra-python.up.railway.app
 */
const PYTHON_BACKEND =
  process.env.PYTHON_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? (() => {
        // Catch misconfiguration at request time (not build time) so we get
        // a clear error instead of a silent 502.
        console.error(
          "[api/python] PYTHON_BACKEND_URL is not set in production! " +
            "Add it in Vercel → Settings → Environment Variables. " +
            "Get the value from your Railway service dashboard."
        );
        return "http://127.0.0.1:8000"; // will fail, but cleanly
      })()
    : "http://127.0.0.1:8000");

const ALLOWED_PREFIXES = ["/bookings", "/tutors"];

function isAllowedPythonPath(path: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("//")) return false;
  return ALLOWED_PREFIXES.some((p) => decoded === p || decoded.startsWith(`${p}/`));
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}

async function proxy(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pathname, searchParams } = new URL(request.url);
  const targetPath = pathname.replace(/^\/api\/python/, "");

  // Explicit allowlist. The backend exposes internal endpoints (e.g. POST
  // /db/query runs raw SQL with no auth), so never forward arbitrary paths.
  // Only the booking/tutor routes used by src/lib/booking-client.ts and the
  // booking hooks are reachable through this proxy.
  if (!isAllowedPythonPath(targetPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const qs = searchParams.toString();
  const targetUrl = `${PYTHON_BACKEND}${targetPath}${qs ? "?" + qs : ""}`;

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") || "application/json",
        // Forward the authenticated user ID so FastAPI can authorise requests
        // without a second Supabase round-trip.
        "X-User-Id": user.id,
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[api/python] Backend unreachable:", msg);

    return NextResponse.json(
      {
        error: "Python backend unreachable",
        detail: msg,
        hint:
          process.env.NODE_ENV === "development"
            ? "Run: npm run dev:python"
            : "Check your Railway service at https://railway.app — set PYTHON_BACKEND_URL in Vercel env vars.",
      },
      { status: 502 }
    );
  }
}
