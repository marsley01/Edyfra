import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  generateWithAI,
  AIRateLimitError,
} from "@/lib/ai-rate-limiter";
import { getActiveInstitutionMembership } from "@/app/actions/institution-guard";

export const runtime = "nodejs";

const InsightSchema = z.object({
  studentUserId: z.string().min(1),
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
});

/**
 * Generate a 3-sentence AI insight for a student using Gemini.
 *   POST /api/ai/insight { studentUserId, term, year }
 * Persists the result on every StudentResultsAnalysis row for that
 * student/term/year so all subjects share the same insight.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const membership = await getActiveInstitutionMembership();
  if (
    !membership ||
    (membership.role !== "INSTITUTION_ADMIN" && membership.role !== "INSTITUTION_DEPUTY")
  ) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = InsightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { studentUserId, term, year } = parsed.data;

  const student = await prisma.user.findUnique({ where: { id: studentUserId } });
  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const current = await prisma.studentResultsAnalysis.findMany({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
  });
  if (current.length === 0) {
    return NextResponse.json({ ok: false, error: "No results to analyse for this term" }, { status: 400 });
  }

  const formRow = await prisma.studentResult.findFirst({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
    select: { form: true },
  });

  const strongest = [...current].sort((a, b) => b.marks - a.marks)[0];
  const weakest = [...current].sort((a, b) => a.marks - b.marks)[0];
  const thisTerm = current
    .map((c) => `${c.subject}: ${c.marks.toFixed(0)}% (${c.trend.toLowerCase()})`)
    .join(", ");
  const lastTerm = current
    .map((c) => `${c.subject}: ${c.lastTermMarks != null ? c.lastTermMarks.toFixed(0) + "%" : "n/a"}`)
    .join(", ");

  const prompt = `Student ${student.name}, Form ${formRow?.form ?? "?"}, has these results this term: ${thisTerm}.
Last term: ${lastTerm}.
Write a 3-sentence insight about this student's academic performance, their strongest area, their biggest weakness, and one specific recommendation for holiday coaching focus. Be direct and specific.`;

  let insight: string;
  try {
    insight = await generateWithAI({
      prompt,
      systemPrompt:
        "You are an experienced Kenyan secondary school academic advisor. Be specific, kind, and actionable.",
      userId: studentUserId,
      feature: "institution_insight",
      temperature: 0.5,
      maxOutputTokens: 300,
    });
  } catch (err) {
    if (err instanceof AIRateLimitError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 429 }
      );
    }
    console.warn("[api/ai/insight] Gemini failed:", err);
    return NextResponse.json({ ok: false, error: "AI service unavailable. Try again." }, { status: 500 });
  }

  await prisma.studentResultsAnalysis.updateMany({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
    data: { aiInsight: insight, aiGeneratedAt: new Date() },
  });

  revalidatePath(`/institution/dashboard/students/${studentUserId}`);
  return NextResponse.json({
    ok: true,
    insight,
    strongest: strongest.subject,
    weakest: weakest.subject,
  });
}
