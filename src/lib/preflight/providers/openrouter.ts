import { ModelProvider } from "./provider";
import type {
  ProviderConfig,
  ProviderCapabilities,
  ProviderHealth,
  ProviderMetrics,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  EmbeddingRequest,
  EmbeddingResponse,
} from "./types";
import { ProviderStatus } from "./types";

interface OpenRouterModelInfo {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
  };
}

export class OpenRouterProvider extends ModelProvider {
  private modelCache: Map<string, OpenRouterModelInfo> = new Map();

  constructor(config: ProviderConfig) {
    super("OPENROUTER", {
      baseUrl: "https://openrouter.ai/api/v1",
      timeout: 60_000,
      maxRetries: 3,
      defaultModel: "openai/gpt-4o",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "openai/gpt-4o";

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.fetch("/chat/completions", {
          method: "POST",
          body: JSON.stringify({
            model,
            messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: request.temperature,
            top_p: request.topP,
            max_tokens: request.maxTokens,
            stop: request.stopSequences,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            tools: request.tools,
          }),
        });

        if (!response.ok) throw new Error(`OpenRouter error (${response.status})`);

        const data = (await response.json()) as {
          id: string;
          model: string;
          choices: { message: { content: string }; finish_reason: string }[];
          usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        return {
          id: data.id,
          model: data.model,
          content: data.choices[0]?.message.content ?? "",
          finishReason: (data.choices[0]?.finish_reason as "stop" | "length" | "tool_calls" | "error") === "stop" ? "stop" : "length",
          usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens },
          latency: performance.now() - startTime,
        };
      } catch (error) {
        if (attempt < (this.config.maxRetries ?? 3) && this.isRetryable(error)) {
          await this.delay(2 ** attempt * 1000);
          continue;
        }
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
    throw new Error("OpenRouter: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "openai/gpt-4o";
    const response = await this.fetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model, messages: request.messages, stream: true }),
    });
    if (!response.ok) throw new Error(`OpenRouter stream error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("OpenRouter: no response body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { id: json.id, model, content: delta.content, finishReason: null };
          }
        } catch {
          // skip
        }
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = performance.now();
    const response = await this.fetch("/embeddings", {
      method: "POST",
      body: JSON.stringify({
        model: request.model ?? "openai/text-embedding-3-small",
        input: typeof request.input === "string" ? [request.input] : request.input,
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter embed error: ${response.status}`);
    const data = (await response.json()) as {
      model: string;
      data: { embedding: number[] }[];
      usage: { prompt_tokens: number; total_tokens: number };
    };
    return {
      model: data.model,
      embeddings: data.data.map((d) => d.embedding),
      usage: { inputTokens: data.usage.prompt_tokens, totalTokens: data.usage.total_tokens },
      latency: performance.now() - startTime,
    };
  }

  async fetchModels(): Promise<OpenRouterModelInfo[]> {
    const response = await this.fetch("/models", { method: "GET" });
    if (!response.ok) throw new Error(`OpenRouter models error: ${response.status}`);
    const data = (await response.json()) as { data: OpenRouterModelInfo[] };
    for (const model of data.data) {
      this.modelCache.set(model.id, model);
    }
    return data.data;
  }

  async getLowestCostModel(requiredContextWindow?: number): Promise<string | null> {
    if (this.modelCache.size === 0) {
      await this.fetchModels().catch(() => {});
    }
    let lowestCost: number | null = null;
    let bestModel: string | null = null;

    for (const [id, info] of this.modelCache) {
      const promptCost = Number.parseFloat(info.pricing.prompt);
      if (requiredContextWindow && info.context_length < requiredContextWindow) continue;
      if (lowestCost === null || promptCost < lowestCost) {
        lowestCost = promptCost;
        bestModel = id;
      }
    }
    return bestModel;
  }

  async health(): Promise<ProviderHealth> {
    try {
      const response = await this.fetch("/models", { method: "GET" });
      return {
        status: response.ok ? ProviderStatus.AVAILABLE : ProviderStatus.DEGRADED,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorCount: response.ok ? 0 : 1,
        avgLatency: 0,
      };
    } catch {
      return {
        status: ProviderStatus.UNAVAILABLE,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorCount: 1,
        avgLatency: 0,
      };
    }
  }

  async metrics(): Promise<ProviderMetrics> {
    return {
      latency_p50: 850,
      latency_p95: 3200,
      latency_p99: 6500,
      errorRate: 0.5,
      requestsPerMin: 900,
      tokensPerMin: 250_000,
      costPerToken: 0.000012,
      costPerRequest: 0.002,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash", "meta-llama/llama-3.1-70b", "mistral/mistral-large"],
      maxTokens: 8192,
      streamingSupport: true,
      functionCalling: true,
      vision: true,
      embedding: true,
      contextWindow: 128_000,
    };
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 60_000);
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization ? { "HTTP-Referer": this.config.organization } : {}),
          ...(init.headers as Record<string, string> ?? {}),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes("Timeout") || error.message.includes("429");
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}