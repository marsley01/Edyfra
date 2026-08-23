import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export interface MashContextData {
  subjectsStruggled: string[];
  topicsCovered: string[];
  lastSessionSummary: string | null;
  weakAreas: Prisma.InputJsonValue;
  strongAreas: Prisma.InputJsonValue;
}

/**
 * Get or create Mash context for a student
 */
export async function getMashContext(userId: string): Promise<MashContextData> {
  try {
    let context = await prisma.mashContext.findUnique({
      where: { userId },
    });

    if (!context) {
      context = await prisma.mashContext.create({
        data: { userId },
      });
    }

    return {
      subjectsStruggled: context.subjectsStruggled || [],
      topicsCovered: context.topicsCovered || [],
      lastSessionSummary: context.lastSessionSummary,
      weakAreas: (context.weakAreas as Prisma.InputJsonValue) || {},
      strongAreas: (context.strongAreas as Prisma.InputJsonValue) || {},
    };
  } catch (error) {
    console.error("Error getting Mash context:", error);
    return {
      subjectsStruggled: [],
      topicsCovered: [],
      lastSessionSummary: null,
      weakAreas: {},
      strongAreas: {},
    };
  }
}

/**
 * Update Mash context after a session
 */
export async function updateMashContext(
  userId: string,
  data: Partial<MashContextData>
) {
  try {
    await prisma.mashContext.upsert({
      where: { userId },
      update: {
        ...(data.subjectsStruggled && {
          subjectsStruggled: { push: data.subjectsStruggled },
        }),
        ...(data.topicsCovered && {
          topicsCovered: { push: data.topicsCovered },
        }),
        ...(data.lastSessionSummary && { lastSessionSummary: data.lastSessionSummary }),
        ...(data.weakAreas && { weakAreas: data.weakAreas as Prisma.InputJsonValue }),
        ...(data.strongAreas && { strongAreas: data.strongAreas as Prisma.InputJsonValue }),
      },
      create: {
        userId,
        subjectsStruggled: data.subjectsStruggled || [],
        topicsCovered: data.topicsCovered || [],
        lastSessionSummary: data.lastSessionSummary,
        weakAreas: (data.weakAreas || {}) as Prisma.InputJsonValue,
        strongAreas: (data.strongAreas || {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("Error updating Mash context:", error);
  }
}

/**
 * Build the Mash system prompt with student context injected
 */
export async function buildMashSystemPrompt(
  userId: string,
  subject: string,
  mode: "normal" | "exam" = "normal"
): Promise<string> {
  const context = await getMashContext(userId);

  const studentContext: string[] = [];
  if (context.subjectsStruggled.length > 0)
    studentContext.push(`Previously struggled with: ${context.subjectsStruggled.join(", ")}.`);
  if (context.topicsCovered.length > 0)
    studentContext.push(`Topics covered: ${context.topicsCovered.join(", ")}.`);
  if (context.weakAreas && Object.keys(context.weakAreas).length > 0)
    studentContext.push(`Weak areas: ${JSON.stringify(context.weakAreas)}.`);
  if (context.strongAreas && Object.keys(context.strongAreas).length > 0)
    studentContext.push(`Strong areas: ${JSON.stringify(context.strongAreas)}.`);
  if (context.lastSessionSummary)
    studentContext.push(`Last session: ${context.lastSessionSummary}.`);

  const contextBlock = studentContext.length > 0
    ? `\n\nStudent history:\n${studentContext.join("\n")}`
    : "";

  let prompt = `You are Mash, a study companion built into Edyfra for Kenyan students. You're helping with ${subject}. You speak like a smart older student — casual, direct, and you reference Kenyan context (CBC curriculum, KCSE, Form levels, university entrance) when it's relevant.${contextBlock}

Rules — follow these without exception:
- Never open with "Great question", "Of course!", "Certainly!", or any filler opener. Just answer.
- Never use more than 2 bullet points in a row — prefer short paragraphs.
- Keep responses under 150 words unless the student explicitly asks for more detail.
- Use contractions: you're, it's, let's, don't, can't, won't.
- If you don't know something, say "honestly not sure about that one — let me suggest where to look" — not a formal disclaimer.
- Reference CBC subjects, KCSE papers, Form 1–4, or university level when relevant to what the student is asking.
- Never say "As an AI language model" or any variation of that.
- Occasionally sign off with "— Mash" (not every message, just when it feels natural like wrapping up an explanation).
- Build on what the student already knows and focus on their gaps.`;

  if (mode === "exam") {
    prompt += `\n\nEXAM MODE: Generate KCSE or university-style questions for ${subject}. Ask one question at a time, wait for the student's answer, then give marks and feedback. Track the running score after each question. Run 5 questions per session and give a final score with areas to review. Be strict but fair.`;
  }

  return prompt;
}

/**
 * Track a student's struggle areas after a session
 */
export async function trackSessionLearning(
  userId: string,
  subject: string,
  topic: string,
  struggled: boolean,
  summary?: string
) {
  try {
    const data: Partial<MashContextData> = {
      topicsCovered: [topic],
    };

    if (struggled) {
      data.subjectsStruggled = [subject];
    }

    if (summary) {
      data.lastSessionSummary = summary;
    }

    await updateMashContext(userId, data);
  } catch (error) {
    console.error("Error tracking session learning:", error);
  }
}
