import { NextResponse } from "next/server";
import { AIService } from "@/utils/ai-service";
import prisma from "@/lib/prisma";
import { EduLevel } from "@/generated/client";

export const maxDuration = 60; // Allow 60 seconds for API generation

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology"];
const LEVELS = [EduLevel.HIGH_SCHOOL, EduLevel.UNIVERSITY];

type ChallengePayload = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export async function GET(request: Request) {
  // Simple auth check for Cron jobs to prevent public triggering
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Unauthorized Cron Attempt", { authHeader });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const results = [];

    for (const level of LEVELS) {
      for (const subject of SUBJECTS) {
        const prompt = `
          Generate a daily educational challenge question for ${subject} at ${level === "HIGH_SCHOOL" ? "High School" : "University"} level.
          Return ONLY valid JSON in this exact structure:
          {
            "question": "The question text",
            "options": ["A", "B", "C", "D"], // Exactly 4 options
            "answer": "The exact string of the correct option",
            "explanation": "Brief explanation of why it is correct"
          }
        `;

        try {
<<<<<<< HEAD
          const aiData = await AIService.generateJSON(prompt) as any;
=======
          const aiData = await AIService.generateJSON<ChallengePayload | null>(prompt);
>>>>>>> origin/main
          
          if (!aiData || !aiData.question) continue;

          const challenge = await prisma.dailyChallenge.create({
            data: {
              subject,
              level,
              question: aiData.question,
              options: aiData.options,
              answer: aiData.answer,
              explanation: aiData.explanation,
              date: tomorrow,
            }
          });
          
          results.push(challenge);
        } catch (err) {
          console.error(`Failed to generate challenge for ${subject} ${level}`, err);
        }
      }
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error("Daily Challenge Cron Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
