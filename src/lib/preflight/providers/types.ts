import type { Duration, Percentage, Timestamp } from "@agent-preflight/types";
import type { ModelFamily, ModelCapability } from "@agent-preflight/types";

// ─── Provider Configuration ──────────────────────────────────────────────────

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string | undefined;
  organization?: string | undefined;
  defaultModel?: string | undefined;
  timeout?: Duration | undefined;
  maxRetries?: number | undefined;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  } | undefined;
}

// ─── Provider Capabilities ───────────────────────────────────────────────────

export interface ProviderCapabilities {
  models: string[];
  maxTokens: number;
  streamingSupport: boolean;
  functionCalling: boolean;
  vision: boolean;
  embedding: boolean;
  contextWindow: number;
}

// ─── Provider Status ─────────────────────────────────────────────────────────

export const ProviderStatus = {
  AVAILABLE: "AVAILABLE",
  DEGRADED: "DEGRADED",
  UNAVAILABLE: "UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ProviderStatus = (typeof ProviderStatus)[keyof typeof ProviderStatus];

// ─── Provider Metrics ────────────────────────────────────────────────────────

export interface ProviderMetrics {
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  errorRate: Percentage;
  requestsPerMin: number;
  tokensPerMin: number;
  costPerToken: number;
  costPerRequest: number;
}

// ─── Model Pricing ───────────────────────────────────────────────────────────

export interface ModelPricing {
  inputPerToken: number;
  outputPerToken: number;
  perRequest: number;
}

// ─── Provider Health ─────────────────────────────────────────────────────────

export interface ProviderHealth {
  status: ProviderStatus;
  lastCheck: Timestamp;
  uptime: Duration;
  errorCount: number;
  avgLatency: number;
}

// ─── Completion Types ────────────────────────────────────────────────────────

export interface CompletionRequest {
  model?: string | undefined;
  messages: CompletionMessage[];
  temperature?: number | undefined;
  topP?: number | undefined;
  topK?: number | undefined;
  maxTokens?: number | undefined;
  stopSequences?: string[] | undefined;
  frequencyPenalty?: number | undefined;
  presencePenalty?: number | undefined;
  tools?: ToolDefinition[] | undefined;
}

export interface CompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string | undefined;
  toolCallId?: string | undefined;
  toolCalls?: ToolCall[] | undefined;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface CompletionResponse {
  id: string;
  model: string;
  content: string;
  finishReason: "stop" | "length" | "tool_calls" | "error";
  toolCalls?: ToolCall[] | undefined;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latency: Duration;
}

export interface CompletionChunk {
  id: string;
  model: string;
  content: string;
  finishReason: "stop" | "length" | "tool_calls" | null;
  toolCalls?: ToolCall[] | undefined;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | undefined;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string | undefined;
}

export interface EmbeddingResponse {
  model: string;
  embeddings: number[][];
  usage: {
    inputTokens: number;
    totalTokens: number;
  };
  latency: Duration;
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: RoutingCondition;
  targetProvider: string;
  targetModel: string;
}

export interface RoutingCondition {
  requiredCapabilities?: ModelCapability[] | undefined;
  maxCost?: number | undefined;
  maxLatency?: number | undefined;
  minContextWindow?: number | undefined;
}

export interface RoutingResult {
  provider: string;
  model: string;
  reason: string;
  estimatedCost?: number | undefined;
  estimatedLatency?: number | undefined;
}

// ─── Provider Metadata ───────────────────────────────────────────────────────

export interface ProviderMetadata {
  name: string;
  displayName: string;
  description: string;
  website: string;
  models: Record<string, ProviderModelInfo>;
}

export interface ProviderModelInfo {
  family: ModelFamily;
  capabilities: ModelCapability[];
  pricing: ModelPricing;
  contextWindow: number;
  maxOutput: number;
  streaming: boolean;
}