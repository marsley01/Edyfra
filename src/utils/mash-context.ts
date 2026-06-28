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

  let prompt = `You are Mash, an expert educational assistant specializing in ${subject}. `;
  prompt += `You are helping a student who is studying ${subject}. `;

  if (context.subjectsStruggled.length > 0) {
    prompt += `This student has previously struggled with: ${context.subjectsStruggled.join(", ")}. `;
  }
  if (context.topicsCovered.length > 0) {
    prompt += `They have covered these topics: ${context.topicsCovered.join(", ")}. `;
  }
  if (context.weakAreas && Object.keys(context.weakAreas).length > 0) {
    prompt += `Their weak areas are: ${JSON.stringify(context.weakAreas)}. `;
  }
  if (context.strongAreas && Object.keys(context.strongAreas).length > 0) {
    prompt += `Their strong areas are: ${JSON.stringify(context.strongAreas)}. `;
  }
  if (context.lastSessionSummary) {
    prompt += `Last session summary: ${context.lastSessionSummary}. `;
  }

  prompt += `Build on what they know and focus on their gaps. Keep explanations clear and practical. Be encouraging and supportive. `;

  if (mode === "exam") {
    prompt += `You are now in EXAM MODE. Generate KCSE or university-style questions for the student's subject. `;
    prompt += `Time their responses, give marks and feedback after each answer. At the end, give a total score and list areas to review before the exam. `;
    prompt += `Be strict but fair — this is exam simulation. Provide the question first, wait for the student's answer, then give marks and feedback. `;
    prompt += `Track the running score and show it after each question. Generate 5 questions per session.`;
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
