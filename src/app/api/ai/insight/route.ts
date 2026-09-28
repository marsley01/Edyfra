import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/admin";
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

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("users")
    .select("name")
    .eq("id", studentUserId)
    .single();

  if (!student) {
    return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
  }

  const { data: current } = await supabase
    .from("student_results_analysis")
    .select("*")
    .eq("student_user_id", studentUserId)
    .eq("institution_id", membership.institution.id)
    .eq("term", term)
    .eq("year", year);

  if (!current || current.length === 0) {
    return NextResponse.json({ ok: false, error: "No results to analyse for this term" }, { status: 400 });
  }

  const { data: formRow } = await supabase
    .from("student_results")
    .select("form")
    .eq("student_user_id", studentUserId)
    .eq("institution_id", membership.institution.id)
    .eq("term", term)
    .eq("year", year)
    .limit(1)
    .maybeSingle();

  const strongest = [...current].sort((a, b) => Number(b.marks) - Number(a.marks))[0];
  const weakest = [...current].sort((a, b) => Number(a.marks) - Number(b.marks))[0];
  const thisTerm = current
    .map((c) => `${c.subject}: ${Number(c.marks).toFixed(0)}% (${(c.trend || "").toLowerCase()})`)
    .join(", ");
  const lastTerm = current
    .map((c) => `${c.subject}: ${c.last_term_marks != null ? Number(c.last_term_marks).toFixed(0) + "%" : "n/a"}`)
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

  await supabase
    .from("student_results_analysis")
    .update({ ai_insight: insight, ai_generated_at: new Date().toISOString() })
    .eq("student_user_id", studentUserId)
    .eq("institution_id", membership.institution.id)
    .eq("term", term)
    .eq("year", year);

  revalidatePath(`/institution/dashboard/students/${studentUserId}`);
  return NextResponse.json({
    ok: true,
    insight,
    strongest: strongest.subject,
    weakest: weakest.subject,
  });
}
