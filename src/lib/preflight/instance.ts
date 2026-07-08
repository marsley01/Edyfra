import { EdyfraAIService } from "./ai-service";
import { createEdyfraMemory } from "./memory-setup";
import { createEdyfraAgentSystem } from "./agents";
import type { EdyfraAgentSystem } from "./agents";

let aiInstance: EdyfraAIService | null = null;
let memoryInstance: ReturnType<typeof createEdyfraMemory> | null = null;
let agentSystemInstance: EdyfraAgentSystem | null = null;

function getConfig() {
  return {
    openrouterKey: process.env.OPENROUTER_API_KEY,
    googleKey: process.env.GOOGLE_AI_KEY,
    appUrl: "https://edyfra-v2.vercel.app",
    appName: "Edyfra",
  };
}

export async function getAI(): Promise<EdyfraAIService> {
  if (!aiInstance) {
    aiInstance = new EdyfraAIService(getConfig());
    await aiInstance.initialize();
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
  memoryInstance = null;
  agentSystemInstance = null;
}
