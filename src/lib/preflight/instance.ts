import { EdyfraAIService } from "./ai-service";
import { createEdyfraMemory } from "./memory-setup";
import { createEdyfraAgentSystem } from "./agents";
import type { EdyfraAgentSystem } from "./agents";
import { getAIConfig } from "@/lib/ai-config";

let aiInstance: EdyfraAIService | null = null;
let instanceKey: string | null = null;
let memoryInstance: ReturnType<typeof createEdyfraMemory> | null = null;
let agentSystemInstance: EdyfraAgentSystem | null = null;

async function getConfig() {
  const config = await getAIConfig();
  return {
    openrouterKey: config.apiKey ?? undefined,
    googleKey: process.env.GOOGLE_AI_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com",
    appName: "Edyfra",
  };
}

export async function getAI(): Promise<EdyfraAIService> {
  const config = await getConfig();

  // Rebuild when the active key changes (e.g. admin saved a new one).
  if (!aiInstance || instanceKey !== (config.openrouterKey ?? null)) {
    aiInstance = new EdyfraAIService(config);
    await aiInstance.initialize();
    instanceKey = config.openrouterKey ?? null;
  }
  return aiInstance;
}

export function getMemory() {
  if (!memoryInstance) {
    memoryInstance = createEdyfraMemory();
  }
  return memoryInstance;
}

export async function getAgentSystem(): Promise<EdyfraAgentSystem> {
  if (!agentSystemInstance) {
    const ai = await getAI();
    const memory = getMemory();
    agentSystemInstance = createEdyfraAgentSystem(ai, memory);
  }
  return agentSystemInstance;
}

export async function resetInstances(): Promise<void> {
  aiInstance = null;
  instanceKey = null;
  memoryInstance = null;
  agentSystemInstance = null;
}
