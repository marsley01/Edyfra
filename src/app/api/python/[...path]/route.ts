import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const PYTHON_BACKEND =
  process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pathname, searchParams } = new URL(request.url);
  const targetPath = pathname.replace(/^\/api\/python/, "");
  const targetUrl = `${PYTHON_BACKEND}${targetPath}${searchParams.toString() ? "?" + searchParams.toString() : ""}`;

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.text()
    : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Python backend unreachable",
        detail: error?.message,
        hint: "Run: uvicorn backend.fastapi_app:app --reload --port 8000",
      },
      { status: 502 },
    );
  }
}
