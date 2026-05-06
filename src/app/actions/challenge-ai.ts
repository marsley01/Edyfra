// AI Challenge Generator
"use server";

import prisma from "@/lib/prisma";
import { Role, EduLevel } from "@prisma/client";

interface ChallengeGenerationRequest {
  level: string; // HIGH_SCHOOL or UNIVERSITY
  subject?: string; // specific subject like Physics, Computer Science, etc.
  topic?: string; // specific topic within the subject
  count?: number; // number of challenges to generate (default 1)
  scheduledDate?: string; // optional date to schedule challenge for
}

interface GeneratedChallenge {
  subject: string;
  level: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

// Generate challenges using AI
export async function generateChallenges(request: ChallengeGenerationRequest): Promise<GeneratedChallenge[]> {
  try {
    // Get AI settings from admin
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN },
      select: { settings: true }
    });

    const settings = (adminUser?.settings || {}) as { googleAiKey?: string };
    const apiKey = settings.googleAiKey || process.env.GOOGLE_AI_KEY;
    
    if (!apiKey) {
      throw new Error("AI API key not configured. Please add it in Admin Settings.");
    }

    const { level, subject, topic, count = 1, scheduledDate } = request;
    
    // Construct the prompt
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

    // Call AI service
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`AI generation failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("AI did not generate valid content");
    }

    // Parse the JSON from the response
    let challenges: GeneratedChallenge[] = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) || 
                         generatedText.match(/\[([\s\S]*?)\]/) ||
                         generatedText.match(/\{[\s\S]*\}/);
      
      let jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generatedText;
      
      // If it's a single object, wrap in array
      if (!jsonString.trim().startsWith('[')) {
        jsonString = `[${jsonString}]`;
      }
      
      challenges = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse AI-generated challenges");
    }

    // Determine the base date for challenges
    const baseDate = scheduledDate ? new Date(scheduledDate) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    // Validate and save challenges to database
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
            date: challengeDate
          }
        });
      })
    );

    return savedChallenges.map(c => ({
      id: c.id,
      subject: c.subject,
      level: c.level,
      question: c.question,
      options: c.options as string[],
      answer: c.answer,
      explanation: c.explanation,
      date: c.date.toISOString()
    }));
  } catch (error) {
    console.error("Error generating challenges:", error);
    throw error instanceof Error ? error : new Error("Failed to generate challenges");
  }
}

// Get challenges for a student based on their education level
export async function getChallengesForStudent(userLevel: string, subject?: string) {
  try {
    const whereClause: any = {
      level: userLevel,
      date: { lte: new Date() }
    };

    if (subject) {
      whereClause.subject = subject;
    }

    const challenges = await prisma.dailyChallenge.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 10
    });

    return challenges;
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return [];
  }
}

// Save challenge attempt
export async function saveChallengeAttempt(userId: string, challengeId: string, correct: boolean) {
  try {
    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      throw new Error("Challenge not found");
    }

    // Check if user already attempted this challenge
    const existingAttempt = await prisma.dailyChallengeAttempt.findFirst({
      where: {
        userId,
        challengeId
      }
    });

    if (existingAttempt) {
      // Update existing attempt
      return await prisma.dailyChallengeAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          correct,
          pointsEarned: correct ? 50 : 0
        }
      });
    }

    // Create new attempt
    return await prisma.dailyChallengeAttempt.create({
      data: {
        userId,
        challengeId,
        correct,
        pointsEarned: correct ? 50 : 0
      }
    });
  } catch (error) {
    console.error("Error saving challenge attempt:", error);
    throw error;
  }
}

// Get challenge statistics for admin
export async function getChallengeStats() {
  try {
    const [totalChallenges, activeChallenges, totalAttempts, correctAttempts] = await Promise.all([
      prisma.dailyChallenge.count(),
      prisma.dailyChallenge.count({
        where: { date: { lte: new Date() } }
      }),
      prisma.dailyChallengeAttempt.count(),
      prisma.dailyChallengeAttempt.count({ where: { correct: true } })
    ]);

    const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    return {
      totalChallenges,
      activeChallenges,
      totalAttempts,
      correctAttempts,
      successRate
    };
  } catch (error) {
    console.error("Error getting challenge stats:", error);
    return {
      totalChallenges: 0,
      activeChallenges: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      successRate: 0
    };
  }
}