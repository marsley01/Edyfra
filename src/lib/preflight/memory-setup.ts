import { MemoryManager } from "@agent-preflight/memory";
import type { MemoryQuery, MemoryEntryMeta } from "@agent-preflight/memory";

export interface EdyfraMemoryConfig {
  maxMashContexts?: number;
  maxEddySessions?: number;
}

export function createEdyfraMemory(config?: EdyfraMemoryConfig): MemoryManager {
  return new MemoryManager(
    {
      autoRouting: true,
      crossLayerSearch: true,
      consolidationInterval: 120_000,
      prefetchEnabled: true,
      prefetchMaxEntries: 50,
      cacheWarmingEnabled: false,
      monitoringInterval: 60_000,
    },
    {},
  );
}

export interface MashContextData {
  subjectsStruggled: string[];
  topicsCovered: string[];
  lastSessionSummary: string | null;
  weakAreas: string[];
  strongAreas: string[];
}

export async function getMashContext(
  memory: MemoryManager,
  userId: string,
): Promise<MashContextData> {
  const result = await memory.get("LONG_TERM", `mash-context:${userId}`);
  if (result?.value) {
    return result.value as MashContextData;
  }
  return {
    subjectsStruggled: [],
    topicsCovered: [],
    lastSessionSummary: null,
    weakAreas: [],
    strongAreas: [],
  };
}

export async function setMashContext(
  memory: MemoryManager,
  userId: string,
  data: Partial<MashContextData>,
): Promise<void> {
  const existing = await getMashContext(memory, userId);
  const updated: MashContextData = { ...existing, ...data };
  await memory.save("LONG_TERM", `mash-context:${userId}`, updated, {
    tags: ["mash-context", `user:${userId}`],
  });
}

export async function getEddySession(
  memory: MemoryManager,
  sessionId: string,
): Promise<{ role: string; content: string }[]> {
  const result = await memory.get("SESSION", `eddy:${sessionId}`);
  if (result?.value) {
    return result.value as { role: string; content: string }[];
  }
  return [];
}

export async function appendEddyMessage(
  memory: MemoryManager,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const history = await getEddySession(memory, sessionId);
  history.push({ role, content });
  await memory.save("SESSION", `eddy:${sessionId}`, history, {
    sessionId,
    ttl: 3_600_000,
  });
}
