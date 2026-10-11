"use server";

import prisma from "@/lib/prisma";
import { EduLevel } from "@/generated/client";
import { generateAIResponse } from "@/utils/openrouter";
import { SESSION_CONFIG, CHALLENGE_CONFIG } from "@/lib/config";
import { recalibrateTier } from "./user";
import { notifyUser } from "@/lib/notifications/server";
import { getAdminGlobalSettings } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Prisma id of the signed-in caller (id OR email, for legacy rows), or null.
 * Everything below is a browser-callable server action, so user ids passed in
 * from the client must never be trusted.
 */
async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email }] : []),
      ],
    },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

interface ChallengeGenerationRequest {
  level: string;
  subject?: string;
  topic?: string;
  count?: number;
  scheduledDate?: string;
}

interface GeneratedChallenge {
  id?: string;
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  date?: string;
}


function normalizeOptions(raw: unknown): string[] {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    raw = Object.values(raw as Record<string, unknown>);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => String(o).trim())
    .filter(Boolean)
    .slice(0, 4);
}

/** Map letter answers (A–D) to the matching option text for grading. */
function normalizeChallengeAnswer(options: string[], answer: string): string {
  const trimmed = answer.trim();
  const letter = trimmed.match(/^([A-D])$/i)?.[1]?.toUpperCase();
  if (letter) {
    const idx = letter.charCodeAt(0) - 65;
    if (options[idx]) return options[idx];
  }
  const exact = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
  return exact || trimmed;
}

function parseChallengesFromAI(aiResponse: string): GeneratedChallenge[] {
  // The AI layer returns an apology string instead of throwing when no key is
  // configured; give that a clear error instead of a JSON syntax error.
  if (/currently offline|trouble thinking/i.test(aiResponse)) {
    throw new Error("AI provider unavailable");
  }
  // Models often wrap JSON in markdown fences; drop them, then parse from the
  // first bracket to its last partner. The old "first [ ... last ]" regex ran
  // first, so for a single question object it grabbed the inner options array.
  const cleaned = aiResponse.replace(/```(?:json)?/gi, "").trim();
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const useArray = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj);
  const open = useArray ? firstArr : firstObj;
  const close = cleaned.lastIndexOf(useArray ? "]" : "}");
  if (open === -1 || close <= open) {
    throw new Error("AI response contained no JSON");
  }
  const parsed = JSON.parse(cleaned.slice(open, close + 1));
  const list = Array.isArray(parsed) ? parsed : [parsed];

  return list.map((item: GeneratedChallenge) => {
    const options = normalizeOptions(item.options);
    if (options.length < 2) {
      throw new Error("AI challenge missing valid options");
    }
    // Reject malformed questions here rather than saving a row nobody can
    // answer (a missing answer used to crash normalizeChallengeAnswer).
    if (typeof item.question !== "string" || item.question.trim().length < 8) {
      throw new Error("AI challenge missing a question");
    }
    if (typeof item.answer !== "string" || !item.answer.trim()) {
      throw new Error("AI challenge missing an answer");
    }
    const answer = normalizeChallengeAnswer(options, item.answer);
    if (!options.includes(answer)) {
      throw new Error("AI challenge answer is not one of the options");
    }
    return {
      subject: item.subject || "General",
      level: item.level || "HIGH_SCHOOL",
      question: item.question,
      options,
      answer,
      explanation: item.explanation || "Review the correct reasoning above.",
    };
  });
}

export async function generateChallenges(request: ChallengeGenerationRequest): Promise<GeneratedChallenge[]> {
  try {
    // Spends AI credits and notifies up to 100 users — never anonymously.
    if (!(await getAuthedUserId())) throw new Error("Unauthorized");

    const { level, subject, topic, count = 1 } = request;

    const levelText = level === "UNIVERSITY" ? "university level" : "high school level";
    const subjectText = subject ? ` in ${subject}` : "";
    const topicText = topic ? ` focusing on ${topic}` : "";

    const prompt = `Generate ${count} fun, engaging, and educational multiple-choice challenge${count > 1 ? 's' : ''} for ${levelText} students${subjectText}${topicText}. 

IMPORTANT: 
- Make questions progressively harder based on performance
- Include real-world Kenyan examples where possible
- Align with KCSE/University curriculum standards
- Use critical thinking over memorization 

For each challenge, provide:
1. A clear, interesting question that makes students think logically
2. Exactly 4 options (A, B, C, D) - make distractors plausible but clearly wrong
3. The correct answer (just the letter: A, B, C, or D)
4. A brief, educational explanation of why the answer is correct

Format the response as a JSON array of objects with these fields:
- "question": the question text
- "options": array of 4 strings (the options)
- "answer": the correct option letter (A, B, C, or D)
- "explanation": brief explanation

Make the questions:
- Educational and aligned with Kenyan curriculum
- Fun and engaging with real-world scenarios
- Logical and thought-provoking
- Appropriate for the education level
- Include practical examples where relevant`;

    const aiResponse = await generateAIResponse(prompt, subject, topic);
    if (!aiResponse?.trim()) {
      throw new Error("AI generation failed");
    }

    const challenges = parseChallengesFromAI(aiResponse);

    const baseDate = request.scheduledDate ? new Date(request.scheduledDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    const savedChallenges = await Promise.all(
      challenges.map(async (challenge: GeneratedChallenge, index: number) => {
        const challengeDate = new Date(baseDate);
        challengeDate.setDate(challengeDate.getDate() + index);

        return await prisma.dailyChallenge.create({
          data: {
            subject: subject || challenge.subject || "General",
            level: level as EduLevel,
            question: challenge.question,
            options: challenge.options,
            answer: challenge.answer,
            explanation: challenge.explanation,
            date: challengeDate,
          },
        });
      })
    );

    if (savedChallenges.length > 0) {
      const users = await prisma.user.findMany({
        where: { educationLevel: level as EduLevel },
        select: { id: true },
        take: 100,
      });
      for (const u of users) {
        notifyUser(u.id, {
          type: "DAILY_CHALLENGE",
          title: "New Challenge Available!",
          body: `A new ${subject || "daily"} challenge is ready. Test your knowledge!`,
          actionUrl: "/dashboard/challenges",
        }).catch(() => {});
      }
    }

    return savedChallenges.map((c) => ({
      id: c.id,
      subject: c.subject,
      level: c.level,
      question: c.question,
      options: c.options as string[],
      answer: c.answer,
      explanation: c.explanation,
      date: c.date.toISOString(),
    }));
  } catch (error) {
    console.error("Error generating challenges:", error);
    throw error instanceof Error ? error : new Error("Failed to generate challenges");
  }
}

export async function getOrCreateDailyChallenge(level: string, subject?: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.dailyChallenge.findFirst({
      where: {
        level: level as EduLevel,
        date: { gte: today, lt: tomorrow },
        ...(subject && { subject }),
      },
    });

    if (existing) return existing;

    const subjects = subject ? [subject] : CHALLENGE_CONFIG.SEED_SUBJECTS;
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];

    try {
      const challenges = await generateChallenges({
        level,
        subject: randomSubject,
        count: 1,
        scheduledDate: today.toISOString(),
      });

      if (challenges.length > 0 && challenges[0].id) {
        return prisma.dailyChallenge.findUnique({ where: { id: challenges[0].id } });
      }
    } catch (aiErr) {
      console.warn("[getOrCreateDailyChallenge] AI generation failed:", aiErr);
      // No demo fallback — challenges are AI-generated only. Caller surfaces a retry.
      return null;
    }
  } catch (error) {
    console.error("Error getting/creating daily challenge:", error);
    return null;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getChallengesForUser(userId: string, level: string) {
  try {
    const me = await getAuthedUserId();
    if (!me) return [];
    userId = me;
    const eduLevel = level as EduLevel;

    // Always fetch or generate today's challenge first to ensure it exists
    await getOrCreateDailyChallenge(level);

    // Prioritize fetching challenges the user HAS NOT attempted
    const unattemptedChallenges = await prisma.dailyChallenge.findMany({
      where: {
        level: eduLevel,
        date: { lte: new Date() },
        attempts: { none: { userId } },
      },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        attempts: { where: { userId }, select: { id: true, correct: true } },
      },
    });

    // If the user has nearly exhausted all challenges, fire off a fresh generation
    if (unattemptedChallenges.length < 3) {
      generateFreshChallengesForUser(userId, level).catch(() => {});
    }

    // Shuffle unattempted so the mix feels fresh every day
    const shuffledUnattempted = shuffleArray(unattemptedChallenges);

    if (shuffledUnattempted.length >= 10) {
      return shuffledUnattempted.slice(0, 10).map((c) => {
        const attempt = c.attempts[0];
        const options = (c.options as string[]) || [];
        return {
          id: c.id,
          subject: c.subject,
          level: c.level,
          question: c.question,
          options,
          answer: attempt ? c.answer : "",
          explanation: attempt ? c.explanation : "",
          date: c.date.toISOString(),
          completed: attempt?.correct === true,
          hasAttempt: !!attempt,
        };
      });
    }

    // Backfill with challenged the user HAS attempted to reach a mix of 10
    const remainingCount = 10 - shuffledUnattempted.length;
    const attemptedChallenges = await prisma.dailyChallenge.findMany({
      where: {
        level: eduLevel,
        date: { lte: new Date() },
        attempts: { some: { userId } },
      },
      orderBy: { date: "desc" },
      take: remainingCount,
      include: {
        attempts: { where: { userId }, select: { id: true, correct: true } },
      },
    });

    // Shuffle attempted too so the order isn't always the same
    const shuffledAttempted = shuffleArray(attemptedChallenges);

    const challenges = [...shuffledUnattempted, ...shuffledAttempted];

    return challenges.map((c) => {
      const attempt = c.attempts[0];
      const options = (c.options as string[]) || [];
      return {
        id: c.id,
        subject: c.subject,
        level: c.level,
        question: c.question,
        options,
        answer: attempt ? c.answer : "",
        explanation: attempt ? c.explanation : "",
        date: c.date.toISOString(),
        completed: attempt?.correct === true,
        hasAttempt: !!attempt,
      };
    });
  } catch (error) {
    console.error("Error fetching challenges for user:", error);
    return [];
  }
}

export async function evaluateChallengeAnswer(challengeId: string, userAnswer: string) {
  try {
    const me = await getAuthedUserId();
    if (!me) throw new Error("Unauthorized");

    const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error("Challenge not found");

    // Every challenge is multiple choice, so grade exactly. The old AI
    // "flexible" grading could mark a wrong option as correct.
    const options = (challenge.options as string[]) || [];
    const chosen = normalizeChallengeAnswer(options, String(userAnswer ?? ""));
    const correctAnswer = normalizeChallengeAnswer(options, challenge.answer);
    const result = {
      correct: chosen.trim().toLowerCase() === correctAnswer.trim().toLowerCase(),
      explanation: challenge.explanation,
      correctAnswer,
    };

    const correct = result.correct === true;

    // Record the attempt here, from the server's own verdict.
    // saveChallengeAttempt() used to take `userId` and `correct` straight from
    // the browser, so anyone could award themselves (or any user) points
    // without answering.
    await recordChallengeAttempt(me, challenge.id, correct);

    return {
      correct,
      explanation: result.explanation || challenge.explanation,
      correctAnswer: result.correctAnswer || challenge.answer,
    };
  } catch (error) {
    console.error("Error evaluating challenge answer:", error);
    throw error;
  }
}

/**
 * Kept for existing callers. The attempt is now recorded by
 * evaluateChallengeAnswer(); the client-supplied `userId` and `correct` are
 * ignored and this just returns the caller's recorded attempt.
 */
export async function saveChallengeAttempt(_userId: string, challengeId: string, _correct: boolean) {
  const me = await getAuthedUserId();
  if (!me) throw new Error("Unauthorized");
  return prisma.dailyChallengeAttempt.findFirst({
    where: { userId: me, challengeId },
  });
}

async function recordChallengeAttempt(userId: string, challengeId: string, correct: boolean) {
  try {
    const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error("Challenge not found");

    const existingAttempt = await prisma.dailyChallengeAttempt.findFirst({
      where: { userId, challengeId },
    });

    const platformSettings = await prisma.platformSettings.findUnique({
      where: { key: "challenge_points" },
    });
    const globalSettings = await getAdminGlobalSettings();
    const configPoints = (platformSettings?.value as any)?.value || SESSION_CONFIG.CHALLENGE_MEDIUM_POINTS;
    const difficultyMultiplier = challenge.level === "UNIVERSITY" ? 1.5 : 1;
    const multiplierStr = globalSettings.pointsMultiplier || "1x";
    const globalMultiplier = parseFloat(multiplierStr.replace("x", "")) || 1;
    const pointsEarned = correct ? Math.round(configPoints * difficultyMultiplier * globalMultiplier) : 0;

    if (existingAttempt) {
      return await prisma.dailyChallengeAttempt.update({
        where: { id: existingAttempt.id },
        data: { correct, pointsEarned },
      });
    }

    const attempt = await prisma.dailyChallengeAttempt.create({
      data: { userId, challengeId, correct, pointsEarned },
    });

    if (correct && pointsEarned > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: pointsEarned } },
      });
      await recalibrateTier(userId);

      notifyUser(userId, {
        type: "POINTS_EARNED",
        title: "Challenge Complete!",
        body: `You earned +${pointsEarned} points for completing today's challenge!`,
        actionUrl: "/dashboard/challenges",
      }).catch(() => {});
    }

    return attempt;
  } catch (error) {
    console.error("Error saving challenge attempt:", error);
    throw error;
  }
}

export async function getTodaysChallenge(level: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const challenge = await prisma.dailyChallenge.findFirst({
      where: {
        level: level as EduLevel,
        date: { gte: today, lt: tomorrow },
      },
      orderBy: { date: "desc" },
    });

    return challenge;
  } catch (error) {
    console.error("Error fetching today's challenge:", error);
    return null;
  }
}

export async function getChallengeCompletion(userId: string, challengeId: string) {
  try {
    const me = await getAuthedUserId();
    if (!me) return null;
    userId = me;
    const attempt = await prisma.dailyChallengeAttempt.findFirst({
      where: { userId, challengeId },
    });
    return attempt;
  } catch (error) {
    console.error("Error fetching challenge completion:", error);
    return null;
  }
}

export async function generateFreshChallengesForUser(userId: string, level: string) {
  try {
    const me = await getAuthedUserId();
    if (!me) return false;
    userId = me;
    const recentAttempts = await prisma.dailyChallengeAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { challenge: { select: { subject: true } } },
    });

    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    recentAttempts.forEach((a) => {
      const s = a.challenge.subject;
      if (!subjectPerformance[s]) subjectPerformance[s] = { correct: 0, total: 0 };
      subjectPerformance[s].total++;
      if (a.correct) subjectPerformance[s].correct++;
    });

    let weakestSubject = "Mathematics";
    let lowestScore = 100;
    Object.entries(subjectPerformance).forEach(([subject, perf]) => {
      if (perf.total >= 2) {
        const score = (perf.correct / perf.total) * 100;
        if (score < lowestScore) { lowestScore = score; weakestSubject = subject; }
      }
    });

    const challenges = await generateChallenges({
      level,
      subject: weakestSubject,
      count: 5,
    });

    return challenges.length > 0;
  } catch (error) {
    console.error("Error generating fresh challenges:", error);
    return false;
  }
}

export async function getChallengeStats() {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const [totalChallenges, activeChallenges, totalAttempts, correctAttempts] = await Promise.all([
      prisma.dailyChallenge.count(),
      prisma.dailyChallenge.count({ where: { date: { gte: todayStart, lt: tomorrowStart } } }),
      prisma.dailyChallengeAttempt.count(),
      prisma.dailyChallengeAttempt.count({ where: { correct: true } }),
    ]);

    const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    return { totalChallenges, activeChallenges, totalAttempts, correctAttempts, successRate };
  } catch (error) {
    console.error("Error getting challenge stats:", error);
    return { totalChallenges: 0, activeChallenges: 0, totalAttempts: 0, correctAttempts: 0, successRate: 0 };
  }
}

/** Calendar day in Kenya (UTC+3), so "today" flips at local midnight. */
function kenyaDayKey(now = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const MAX_FRESH_PER_DAY = 5;

type TodayRecord = { ids: string[] };

async function readToday(userId: string, day: string): Promise<TodayRecord> {
  const row = await prisma.platformSettings.findUnique({ where: { key: `daily-challenge:${userId}:${day}` } });
  const ids = (row?.value as TodayRecord | null)?.ids;
  return { ids: Array.isArray(ids) ? ids : [] };
}

async function writeToday(userId: string, day: string, record: TodayRecord) {
  const key = `daily-challenge:${userId}:${day}`;
  await prisma.platformSettings.upsert({
    where: { key },
    create: { key, value: record },
    update: { value: record },
  });
}

/** What the browser gets: never the answer until the student has attempted it. */
async function toClientChallenge(challengeId: string, userId: string) {
  const c = await prisma.dailyChallenge.findUnique({
    where: { id: challengeId },
    include: { attempts: { where: { userId }, select: { correct: true } } },
  });
  if (!c) return null;
  const attempt = c.attempts[0];
  return {
    id: c.id,
    subject: c.subject,
    level: c.level,
    question: c.question,
    options: (c.options as string[]) || [],
    answer: attempt ? c.answer : "",
    explanation: attempt ? c.explanation : "",
    attempted: !!attempt,
    correct: attempt?.correct ?? null,
  };
}

/**
 * Today's personal challenge for the signed-in student.
 *
 * It used to call the AI on every dashboard load, creating a new challenge row
 * (and an AI bill) each time, and it returned the correct answer to the
 * browser. Now the first call each day generates one challenge from the
 * student's subjects, weak topics and recent results; later calls return the
 * same one. `fresh: true` (the "New challenge" button) generates another, up
 * to MAX_FRESH_PER_DAY per day.
 */
export async function generatePersonalizedChallenge(
  _userId: string,
  level: string,
  opts: { fresh?: boolean } = {},
) {
  // Always personalise for the caller, never for a client-supplied id.
  const me = await getAuthedUserId();
  if (!me) throw new Error("Unauthorized");

  const day = kenyaDayKey();
  const today = await readToday(me, day);

  if (!opts.fresh && today.ids.length > 0) {
    const existing = await toClientChallenge(today.ids[today.ids.length - 1], me);
    if (existing) return existing;
  }
  if (opts.fresh && today.ids.length >= MAX_FRESH_PER_DAY) {
    throw new Error(`You've had ${MAX_FRESH_PER_DAY} challenges today. Come back tomorrow for more.`);
  }

  const created = await createPersonalizedChallenge(me, level);
  await writeToday(me, day, { ids: [...today.ids, created.id] });
  return toClientChallenge(created.id, me);
}

async function createPersonalizedChallenge(userId: string, level: string) {
  try {

    // ── 1. Onboarding profile: the subjects the student picked + weak topics ──
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { subjects: true, weakTopics: true },
    });
    const selectedSubjects = (profile?.subjects as string[] | null) ?? [];
    const weakTopics = (profile?.weakTopics as string[] | null) ?? [];

    // ── 2. Attempt history: real performance per subject ──
    const recentAttempts = await prisma.dailyChallengeAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { challenge: { select: { subject: true, level: true } } },
    });

    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    recentAttempts.forEach((attempt) => {
      const subject = attempt.challenge.subject;
      if (!subjectPerformance[subject]) subjectPerformance[subject] = { correct: 0, total: 0 };
      subjectPerformance[subject].total++;
      if (attempt.correct) subjectPerformance[subject].correct++;
    });

    // ── 3. Pick the target subject ──
    //    a) Weakest performed subject (needs >= 3 attempts for a real signal)
    //    b) Otherwise rotate through the subjects chosen at onboarding, so the
    //       challenge always targets something the student actually studies.
    let targetSubject = "";
    let targetNote = "";
    let lowestScore = 100;
    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance.total >= 3) {
        const score = (performance.correct / performance.total) * 100;
        if (score < lowestScore) {
          lowestScore = score;
          targetSubject = subject;
          targetNote = `(recent success rate ${Math.round(score)}% — weakest performed subject)`;
        }
      }
    });

    if (!targetSubject && selectedSubjects.length > 0) {
      // Deterministic daily rotation through the student's own subjects
      const dayIndex = Math.floor(Date.now() / 86_400_000);
      targetSubject = selectedSubjects[dayIndex % selectedSubjects.length];
      targetNote = "(chosen from the subjects you selected during onboarding)";
    }

    if (!targetSubject) {
      targetSubject = "Mathematics";
      targetNote = "(default — set your subjects on your profile for targeted challenges)";
    }

    // Weak topics from onboarding that map to the target subject get drilled
    const relevantWeakTopics = weakTopics
      .map((t) => String(t).trim())
      .filter(Boolean);

    // ── 4. AI generates the real challenge ──
    const adaptivePrompt = `Create a challenging but achievable multiple-choice question for ${level === "UNIVERSITY" ? "university" : "high school"} level students.

STUDENT ANALYSIS:
- Target subject: ${targetSubject} ${targetNote}
- Recent success rate: ${recentAttempts.length > 0 ? Math.round((recentAttempts.filter((a) => a.correct).length / recentAttempts.length) * 100) : 0}%
- Subjects the student studies: ${selectedSubjects.join(", ") || "not set"}
${relevantWeakTopics.length > 0 ? `- Weak topics flagged by the student: ${relevantWeakTopics.join(", ")} — aim the question at ONE of these topics.` : ""}

TASK:
Generate a question for ${targetSubject} that:
1. Is slightly challenging (target 60-70% success rate)
2. Addresses common misconceptions in this subject
3. Includes real-world Kenyan context
4. Builds confidence while teaching critical thinking

Format: {"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}`;

    const aiResponse = await generateAIResponse(adaptivePrompt, targetSubject);
    if (!aiResponse?.trim()) {
      throw new Error("AI generation failed");
    }

    const [parsed] = parseChallengesFromAI(aiResponse);

    return await prisma.dailyChallenge.create({
      data: {
        subject: targetSubject,
        level: level as EduLevel,
        question: parsed.question,
        options: parsed.options,
        answer: parsed.answer,
        explanation: parsed.explanation,
        date: new Date(),
      },
    });
  } catch (error) {
    // No demo fallback — if the AI is unavailable the UI shows a retry.
    console.warn("Error generating personalized challenge:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to generate personalized challenge");
  }
}
