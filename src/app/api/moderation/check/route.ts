import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const MODERATION_URL = process.env.PYTHON_MODERATION_URL || "http://localhost:8003";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, userId, sessionId } = body;

    if (!text || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let result = null;
    try {
      const res = await fetch(`${MODERATION_URL}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          user_id: userId,
          source: "message",
          session_id: sessionId,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) result = await res.json();
    } catch {
      return NextResponse.json({ moderated: false, reason: "service_unavailable" });
    }

    if (result?.should_report) {
      await prisma.user.update({
        where: { id: userId },
        data: { strikes: { increment: 1 } },
      });

      if (result.toxicity_score >= 0.8 && sessionId) {
        await prisma.message.updateMany({
          where: { sessionId, content: text },
          data: { flagged: true },
        });
      }
    }

    return NextResponse.json({ moderated: true, result });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
