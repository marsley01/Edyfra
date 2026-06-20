"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";
import { getResend } from "@/lib/email";

const InsightSchema = z.object({
  studentUserId: z.string().min(1),
  term: z.coerce.number().int().min(1).max(3),
  year: z.coerce.number().int().min(2020).max(2099),
});

/**
 * Generate a 3-sentence AI insight for a student using OpenRouter.
 * Persists the result on every StudentResultsAnalysis row for that
 * student/term/year so all subjects share the same insight.
 */
export async function generateStudentInsight(input: z.infer<typeof InsightSchema>) {
  const membership = await requireInstitutionAdmin();
  const parsed = InsightSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { studentUserId, term, year } = parsed.data;

  const student = await prisma.user.findUnique({ where: { id: studentUserId } });
  if (!student) return { ok: false as const, error: "Student not found" };

  const current = await prisma.studentResultsAnalysis.findMany({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
  });
  if (current.length === 0) {
    return { ok: false as const, error: "No results to analyse for this term" };
  }

  const formRow = await prisma.studentResult.findFirst({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
    select: { form: true },
  });

  // Build prompt
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
    insight = await callOpenRouter(prompt);
  } catch (err) {
    console.warn("[generateStudentInsight] openrouter failed:", err);
    return { ok: false as const, error: "AI service unavailable. Try again." };
  }

  await prisma.studentResultsAnalysis.updateMany({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
    data: { aiInsight: insight, aiGeneratedAt: new Date() },
  });

  revalidatePath(`/institution/dashboard/students/${studentUserId}`);
  return { ok: true as const, insight, strongest: strongest.subject, weakest: weakest.subject };
}

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an experienced Kenyan secondary school academic advisor. Be specific, kind, and actionable.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 250,
      temperature: 0.5,
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "No insight generated.";
}

export async function emailInsightToTeacher(
  studentUserId: string,
  term: number,
  year: number,
) {
  const membership = await requireInstitutionAdmin();
  const student = await prisma.user.findUnique({ where: { id: studentUserId } });
  if (!student) return { ok: false as const, error: "Student not found" };

  const analyses = await prisma.studentResultsAnalysis.findMany({
    where: { studentUserId, institutionId: membership.institution.id, term, year },
  });
  const insight = analyses[0]?.aiInsight;
  if (!insight) return { ok: false as const, error: "Generate the insight first" };

  const teachers = await prisma.institutionMember.findMany({
    where: { institutionId: membership.institution.id, role: "INSTITUTION_TEACHER", status: "ACTIVE" },
    include: { user: { select: { email: true, name: true } } },
  });
  if (teachers.length === 0) return { ok: false as const, error: "No teachers to email" };

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "Edyfra Institutions <institutions@edyfra.com>",
      to: teachers.map((t) => t.user.email),
      subject: `AI insight — ${student.name} (Term ${term} ${year})`,
      html: `
        <h2>AI Insight for ${student.name}</h2>
        <p>${insight}</p>
        <p><em>Generated by Edyfra Institutions</em></p>
      `,
    });
    return { ok: true as const, count: teachers.length };
  } catch (e) {
    console.warn("[emailInsightToTeacher] failed:", e);
    return { ok: false as const, error: "Email service failed" };
  }
}
