"use server";

import prisma from "@/lib/prisma";
import { EduLevel } from "@prisma/client";
import { generateAIResponse } from "@/utils/openrouter";
import { SESSION_CONFIG, CHALLENGE_CONFIG } from "@/lib/config";

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

export async function generateChallenges(request: ChallengeGenerationRequest): Promise<GeneratedChallenge[]> {
  try {
    const { level, subject, topic, count = 1 } = request;

    const levelText = level === "UNIVERSITY" ? "university level" : "high school level";
    const subjectText = subject ? ` in ${subject}` : "";
    const topicText = topic ? ` focusing on ${topic}` : "";

    const prompt = `Generate ${count} fun, engaging, and educational multiple-choice challenge${count > 1 ? 's' : ''} for ${levelText} students${subjectText}${topicText}. 

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
    if (!aiResponse || aiResponse.includes("taking a break")) {
      throw new Error("AI generation failed");
    }

    let challenges: GeneratedChallenge[] = [];
    try {
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                         aiResponse.match(/\[([\s\S]*?)\]/) ||
                         aiResponse.match(/\{[\s\S]*\}/);

      let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      if (!jsonString.trim().startsWith('[')) jsonString = `[${jsonString}]`;
      challenges = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI-generated challenges");
    }

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

    const challenges = await generateChallenges({
      level,
      subject: randomSubject,
      count: 1,
      scheduledDate: today.toISOString(),
    });

    if (challenges.length === 0) throw new Error("Failed to generate challenge");
    return challenges[0];
  } catch (error) {
    console.error("Error getting/creating daily challenge:", error);
    // Fallback: create a hardcoded challenge when AI fails
    try {
      const fallback = {
        question: level === "UNIVERSITY"
          ? "What is the derivative of f(x) = x²?"
          : "What is the chemical symbol for water?",
        options: level === "UNIVERSITY"
          ? ["2x", "x²", "2", "x"]
          : ["H₂O", "CO₂", "NaCl", "O₂"],
        answer: level === "UNIVERSITY" ? "2x" : "H₂O",
        explanation: level === "UNIVERSITY"
          ? "The power rule states that d/dx(xⁿ) = nxⁿ⁻¹, so d/dx(x²) = 2x."
          : "Water's chemical name is dihydrogen monoxide, with the formula H₂O.",
        subject: subject || "General",
      };
      return await prisma.dailyChallenge.create({
        data: {
          subject: fallback.subject,
          level: level as EduLevel,
          question: fallback.question,
          options: fallback.options,
          answer: fallback.answer,
          explanation: fallback.explanation,
          date: new Date(),
        },
      });
    } catch {
      return null;
    }
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
      result = {
        correct: userAnswer.toLowerCase().trim() === challenge.answer.toLowerCase().trim(),
        explanation: challenge.explanation,
        correctAnswer: challenge.answer,
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
