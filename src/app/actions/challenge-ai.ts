"use server";

import prisma from "@/lib/prisma";
import { EduLevel } from "@prisma/client";
import { generateAIResponse } from "@/utils/openrouter";
import { SESSION_CONFIG, CHALLENGE_CONFIG } from "@/lib/config";
import { recalibrateTier } from "./user";
import { notifyUser } from "./notifications";

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

/* ── Static fallback challenges (AI-free backup) ── */
const STATIC_CHALLENGES: GeneratedChallenge[] = [
  {
    subject: "Mathematics",
    level: "HIGH_SCHOOL",
    question: "If a student scores 80% on a 20-question exam, how many questions did they answer correctly?",
    options: ["14", "15", "16", "18"],
    answer: "16",
    explanation: "80% of 20 is 0.8 × 20 = 16 questions correct.",
  },
  {
    subject: "Mathematics",
    level: "HIGH_SCHOOL",
    question: "What is the next number in the sequence: 2, 6, 18, 54, ___?",
    options: ["108", "162", "72", "90"],
    answer: "162",
    explanation: "Each term is multiplied by 3: 54 × 3 = 162.",
  },
  {
    subject: "Physics",
    level: "HIGH_SCHOOL",
    question: "Which of the following is NOT a unit of energy?",
    options: ["Joule", "Watt", "Calorie", "Kilowatt-hour"],
    answer: "Watt",
    explanation: "Watt (W) is a unit of power, not energy. Power is energy per unit time (J/s).",
  },
  {
    subject: "Chemistry",
    level: "HIGH_SCHOOL",
    question: "What is the chemical symbol for the element Gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    answer: "Au",
    explanation: "Gold's symbol Au comes from the Latin word 'aurum' meaning 'shining dawn'.",
  },
  {
    subject: "Biology",
    level: "HIGH_SCHOOL",
    question: "Which organ in the human body is primarily responsible for filtering blood?",
    options: ["Liver", "Kidneys", "Heart", "Lungs"],
    answer: "Kidneys",
    explanation: "The kidneys filter waste products and excess substances from the blood to produce urine.",
  },
  {
    subject: "English",
    level: "HIGH_SCHOOL",
    question: "Identify the figure of speech: 'The classroom was a zoo during the teacher's absence.'",
    options: ["Simile", "Metaphor", "Alliteration", "Personification"],
    answer: "Metaphor",
    explanation: "A metaphor directly compares the classroom to a zoo without using 'like' or 'as'.",
  },
  {
    subject: "Mathematics",
    level: "UNIVERSITY",
    question: "∫(3x² + 2x + 1)dx evaluated from x=0 to x=2 equals:",
    options: ["10", "14", "8", "12"],
    answer: "14",
    explanation: "∫(3x²+2x+1)dx = x³ + x² + x |₀² = (8 + 4 + 2) − (0) = 14.",
  },
  {
    subject: "Geography",
    level: "HIGH_SCHOOL",
    question: "Which is the highest mountain in Africa?",
    options: ["Mount Kenya", "Kilimanjaro", "Rwenzori Mountains", "Mount Meru"],
    answer: "Kilimanjaro",
    explanation: "Mount Kilimanjaro in Tanzania stands at 5,895 m (19,341 ft), making it Africa's tallest peak.",
  },
  {
    subject: "History",
    level: "HIGH_SCHOOL",
    question: "The Berlin Conference of 1884–85 is historically significant because it:",
    options: ["Ended World War I", "Partitioned Africa among European powers", "Formed the United Nations", "Abolished the slave trade"],
    answer: "Partitioned Africa among European powers",
    explanation: "European nations divided Africa into colonies at the Berlin Conference without any African representation.",
  },
  {
    subject: "Kiswahili",
    level: "HIGH_SCHOOL",
    question: "Neno 'Kiswahili' linamaanisha nini?",
    options: ["Lugha ya mwambao", "Lugha ya wavuvi", "Lugha ya wenyeji", "Lugha ya wafugaji"],
    answer: "Lugha ya mwambao",
    explanation: "'Kiswahili' linatokana na neno Arab 'Sahil' linalomaanisha 'pwani' — lugha ya watu wa pwani ya Afrika Mashariki.",
  },
];

function normalizeOptions(raw: unknown): string[] {
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
  const jsonMatch =
    aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
    aiResponse.match(/\[[\s\S]*\]/) ||
    aiResponse.match(/\{[\s\S]*\}/);

  let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
  if (!jsonString.trim().startsWith("[")) jsonString = `[${jsonString}]`;
  const parsed = JSON.parse(jsonString);
  const list = Array.isArray(parsed) ? parsed : [parsed];

  return list.map((item: GeneratedChallenge) => {
    const options = normalizeOptions(item.options);
    if (options.length < 2) {
      throw new Error("AI challenge missing valid options");
    }
    return {
      subject: item.subject || "General",
      level: item.level || "HIGH_SCHOOL",
      question: item.question,
      options,
      answer: normalizeChallengeAnswer(options, item.answer),
      explanation: item.explanation || "Review the correct reasoning above.",
    };
  });
}

export async function generateChallenges(request: ChallengeGenerationRequest): Promise<GeneratedChallenge[]> {
  try {
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

async function seedStaticChallenge(level: string, subject?: string) {
  const pool = subject
    ? STATIC_CHALLENGES.filter(c => c.subject === subject && c.level === level)
    : STATIC_CHALLENGES.filter(c => c.level === level);

  const pick = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : STATIC_CHALLENGES[Math.floor(Math.random() * STATIC_CHALLENGES.length)];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.dailyChallenge.create({
    data: {
      subject: pick.subject,
      level: level as EduLevel,
      question: pick.question,
      options: pick.options,
      answer: pick.answer,
      explanation: pick.explanation,
      date: today,
    },
  });
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
      console.warn("[getOrCreateDailyChallenge] AI generation failed, using static fallback:", aiErr);
    }

    // Fallback: static challenge when AI is unavailable
    return await seedStaticChallenge(level, subject);
  } catch (error) {
    console.error("Error getting/creating daily challenge:", error);
    return null;
  }
}

export async function getChallengesForUser(userId: string, level: string) {
  try {
    const eduLevel = level as EduLevel;
    let challenges = await prisma.dailyChallenge.findMany({
      where: {
        level: eduLevel,
        date: { lte: new Date() },
      },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        attempts: {
          where: { userId },
          select: { id: true, correct: true },
        },
      },
    });

    if (challenges.length === 0) {
      await getOrCreateDailyChallenge(level);
      challenges = await prisma.dailyChallenge.findMany({
        where: { level: eduLevel, date: { lte: new Date() } },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          attempts: {
            where: { userId },
            select: { id: true, correct: true },
          },
        },
      });
    }

    return challenges.map((c) => {
      const attempt = c.attempts[0];
      const options = (c.options as string[]) || [];
      return {
        id: c.id,
        subject: c.subject,
        level: c.level,
        question: c.question,
        options,
        answer: c.answer,
        explanation: c.explanation,
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
    const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error("Challenge not found");

    const levelText = challenge.level === "UNIVERSITY" ? "university" : "high school";
    const prompt = `You are evaluating a student's answer to a ${levelText} level challenge.

Question: "${challenge.question}"
Correct Answer: "${challenge.answer}"
Student's Answer: "${userAnswer}"

Evaluate the student's answer. Determine if it is correct or incorrect. Be flexible — accept paraphrased answers, synonyms, and partially correct answers if they demonstrate understanding.

Respond with a JSON object:
{
  "correct": true/false,
  "explanation": "Brief explanation of why the answer is right or wrong",
  "correctAnswer": "${challenge.answer}"
}`;

    const aiResponse = await generateAIResponse(prompt, challenge.subject);
    if (!aiResponse) throw new Error("AI evaluation failed");

    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      result = JSON.parse(jsonString);
    } catch {
      const options = (challenge.options as string[]) || [];
      const normalizedUser = normalizeChallengeAnswer(options, userAnswer);
      const normalizedCorrect = normalizeChallengeAnswer(options, challenge.answer);
      result = {
        correct: normalizedUser.toLowerCase().trim() === normalizedCorrect.toLowerCase().trim(),
        explanation: challenge.explanation,
        correctAnswer: normalizedCorrect,
      };
    }

    return {
      correct: result.correct,
      explanation: result.explanation || challenge.explanation,
      correctAnswer: result.correctAnswer || challenge.answer,
    };
  } catch (error) {
    console.error("Error evaluating challenge answer:", error);
    throw error;
  }
}

export async function saveChallengeAttempt(userId: string, challengeId: string, correct: boolean) {
  try {
    const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error("Challenge not found");

    const existingAttempt = await prisma.dailyChallengeAttempt.findFirst({
      where: { userId, challengeId },
    });

    const platformSettings = await prisma.platformSettings.findUnique({
      where: { key: "challenge_points" },
    });
    const configPoints = (platformSettings?.value as any)?.value || SESSION_CONFIG.CHALLENGE_MEDIUM_POINTS;
    const difficultyMultiplier = challenge.level === "UNIVERSITY" ? 1.5 : 1;
    const pointsEarned = correct ? Math.round(configPoints * difficultyMultiplier) : 0;

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
    const attempt = await prisma.dailyChallengeAttempt.findFirst({
      where: { userId, challengeId },
    });
    return attempt;
  } catch (error) {
    console.error("Error fetching challenge completion:", error);
    return null;
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

export async function generatePersonalizedChallenge(userId: string, level: string) {
  try {
    // Get user's recent performance to personalize difficulty
    const recentAttempts = await prisma.dailyChallengeAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        challenge: {
          select: { subject: true, level: true }
        }
      }
    });

    // Analyze performance patterns
    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    recentAttempts.forEach(attempt => {
      const subject = attempt.challenge.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { correct: 0, total: 0 };
      }
      subjectPerformance[subject].total++;
      if (attempt.correct) {
        subjectPerformance[subject].correct++;
      }
    });

    // Find weakest subject for targeted improvement
    let weakestSubject = "Mathematics";
    let lowestScore = 100;
    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance.total >= 3) { // Only consider subjects with enough data
        const score = (performance.correct / performance.total) * 100;
        if (score < lowestScore) {
          lowestScore = score;
          weakestSubject = subject;
        }
      }
    });

    // Generate adaptive challenge based on performance
    const adaptivePrompt = `Create a challenging but achievable multiple-choice question for ${level === "UNIVERSITY" ? "university" : "high school"} level students.

STUDENT PERFORMANCE ANALYSIS:
- Recent success rate: ${recentAttempts.length > 0 ? Math.round((recentAttempts.filter(a => a.correct).length / recentAttempts.length) * 100) : 0}%
- Weakest subject: ${weakestSubject} (${lowestScore}% success rate)
- Subjects attempted: ${Object.keys(subjectPerformance).join(", ")}

TASK:
Generate a question for ${weakestSubject} that:
1. Is slightly challenging (target 60-70% success rate)
2. Addresses common misconceptions in this subject
3. Includes real-world Kenyan context
4. Builds confidence while teaching critical thinking

Format: {"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}`;

    const aiResponse = await generateAIResponse(adaptivePrompt, weakestSubject);
    if (!aiResponse?.trim()) {
      throw new Error("AI generation failed");
    }

    const [parsed] = parseChallengesFromAI(
      aiResponse.trim().startsWith("[") ? aiResponse : `[${aiResponse.match(/\{[\s\S]*\}/)?.[0] || aiResponse}]`
    );

    return await prisma.dailyChallenge.create({
      data: {
        subject: weakestSubject,
        level: level as EduLevel,
        question: parsed.question,
        options: parsed.options,
        answer: parsed.answer,
        explanation: parsed.explanation,
        date: new Date(),
      },
    });
  } catch (error) {
    console.error("Error generating personalized challenge:", error);
    throw error instanceof Error ? error : new Error("Failed to generate personalized challenge");
  }
}
