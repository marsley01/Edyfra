import { EdyfraAIService } from "./ai-service";
import { MemoryManager } from "@agent-preflight/memory";
import { getMashContext, getEddySession, appendEddyMessage } from "./memory-setup";
import type { ModelCapability } from "@agent-preflight/types";

export interface AgentContext {
  userId?: string;
  sessionId?: string;
  subject?: string;
  topic?: string;
  mode?: "normal" | "exam";
}

export interface EdyfraAgentSystem {
  ai: EdyfraAIService;
  memory: MemoryManager;

  eddy: {
    query(message: string, ctx: AgentContext): Promise<string>;
  };

  mash: {
    tutor(message: string, ctx: AgentContext): Promise<string>;
    getContext(userId: string): Promise<{
      subjectsStruggled: string[];
      topicsCovered: string[];
      weakAreas: string[];
      strongAreas: string[];
    }>;
    trackSession(userId: string, subject: string, topic: string, struggled: boolean): Promise<void>;
  };

  institution: {
    generateInsight(studentData: string): Promise<string>;
  };

  challenge: {
    generate(subject: string, level: string): Promise<Record<string, unknown>>;
    evaluate(question: string, userAnswer: string, correctAnswer: string): Promise<boolean>;
  };
}

export function createEdyfraAgentSystem(ai: EdyfraAIService, memory: MemoryManager): EdyfraAgentSystem {
  return {
    ai,
    memory,

    eddy: {
      async query(message: string, ctx: AgentContext): Promise<string> {
        const sysPrompt = [
          "You are Eddy, the friendly Edyfra campus guide and assistant.",
          "You help Kenyan students navigate the Edyfra platform.",
          "",
          "Edyfra features: AI tutor matching, live study rooms (Stream Video),",
          "study groups, resource library, gamification (XP, tiers, achievements),",
          "daily challenges, AI tutor (Mash AI), community feed, tutor marketplace,",
          "institution management, payments (M-Pesa), referral program.",
        ].join("\n");

        const history = ctx.sessionId ? await getEddySession(memory, ctx.sessionId) : [];

        const contextPrompt = ctx.userId
          ? `[User context: ${ctx.userId}]\n${message}`
          : message;

        const response = await ai.generateCompletion(contextPrompt, sysPrompt, {
          requiredCapabilities: ["FAST"],
          maxTokens: 1024,
        });

        if (ctx.sessionId) {
          await appendEddyMessage(memory, ctx.sessionId, "user", message);
          await appendEddyMessage(memory, ctx.sessionId, "assistant", response);
        }

        return response;
      },
    },

    mash: {
      async tutor(message: string, ctx: AgentContext): Promise<string> {
        const mashCtx = ctx.userId ? await getMashContext(memory, ctx.userId) : null;

        const systemParts = [
          "You are Mash AI, an expert tutor on the Edyfra platform.",
          "You help Kenyan students master their subjects.",
          "Be warm, encouraging, and thorough in your explanations.",
          "Use Kenyan curriculum context (KCSE, university) where relevant.",
        ];

        if (mashCtx) {
          if (mashCtx.subjectsStruggled.length > 0) {
            systemParts.push(`Student struggles with: ${mashCtx.subjectsStruggled.join(", ")}`);
          }
          if (mashCtx.weakAreas.length > 0) {
            systemParts.push(`Weak areas: ${mashCtx.weakAreas.join(", ")}`);
          }
          if (mashCtx.strongAreas.length > 0) {
            systemParts.push(`Strong areas: ${mashCtx.strongAreas.join(", ")}`);
          }
        }

        if (ctx.subject) {
          systemParts.push(`Current subject: ${ctx.subject}`);
        }
        if (ctx.topic) {
          systemParts.push(`Current topic: ${ctx.topic}`);
        }

        if (ctx.mode === "exam") {
          systemParts.push("Mode: EXAM SIMULATION. Generate KCSE/university-style questions with scoring.");
        }

        const sysPrompt = systemParts.join("\n");
        return ai.generateCompletion(message, sysPrompt, {
          requiredCapabilities: ["REASONING"],
          maxTokens: 2048,
        });
      },

      async getContext(userId: string) {
        return getMashContext(memory, userId);
      },

      async trackSession(userId: string, subject: string, topic: string, struggled: boolean) {
        const ctx = await getMashContext(memory, userId);
        if (!ctx.topicsCovered.includes(topic)) {
          ctx.topicsCovered.push(topic);
        }
        if (struggled && !ctx.subjectsStruggled.includes(subject)) {
          ctx.subjectsStruggled.push(subject);
        }
        if (struggled && !ctx.weakAreas.includes(topic)) {
          ctx.weakAreas.push(topic);
        }
        await memory.save("LONG_TERM", `mash-context:${userId}`, ctx, {
          tags: ["mash-context", `user:${userId}`],
        });
      },
    },

    institution: {
      async generateInsight(studentData: string): Promise<string> {
        const sysPrompt = [
          "You are an educational analyst for Kenyan institutions.",
          "Generate a concise 3-sentence academic insight for a student",
          "based on their term results. Identify strongest/weakest subjects",
          "and recommend holiday coaching focus.",
        ].join("\n");

        return ai.generateCompletion(
          `Analyze this student data and provide insight: ${studentData}`,
          sysPrompt,
          { requiredCapabilities: ["FAST"], maxTokens: 250 },
        );
      },
    },

    challenge: {
      async generate(subject: string, level: string): Promise<Record<string, unknown>> {
        const sysPrompt = [
          "You are a KCSE/University exam question generator.",
          "Generate a multiple choice question with 4 options.",
          "Return ONLY valid JSON with keys: question, options (array of 4), answer, explanation.",
        ].join("\n");

        return ai.generateJSON(
          `Generate a ${level}-level ${subject} question with Kenyan curriculum context.`,
          undefined,
          { requiredCapabilities: ["FAST"], maxTokens: 500 },
        );
      },

      async evaluate(question: string, userAnswer: string, correctAnswer: string): Promise<boolean> {
        const sysPrompt = "Evaluate if the student's answer is correct. Accept paraphrased answers. Return JSON: { correct: boolean, explanation: string }";

        const result = await ai.generateJSON(
          `Question: ${question}\nStudent answer: ${userAnswer}\nCorrect answer: ${correctAnswer}`,
          { correct: false, explanation: "" },
          { requiredCapabilities: ["FAST"], maxTokens: 300 },
        );

        return result?.correct === true;
      },
    },
  };
}
