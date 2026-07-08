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

export class MistralProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("MISTRAL", {
      baseUrl: "https://api.mistral.ai/v1",
      timeout: 30_000,
      maxRetries: 3,
      defaultModel: "mistral-large-2411",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "mistral-large-2411";

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
          }),
        });

        if (!response.ok) throw new Error(`Mistral error (${response.status})`);

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
    throw new Error("Mistral: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "mistral-large-2411";
    const response = await this.fetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model, messages: request.messages, stream: true }),
    });
    if (!response.ok) throw new Error(`Mistral stream error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Mistral: no response body");
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
        model: request.model ?? "mistral-embed",
        input: typeof request.input === "string" ? [request.input] : request.input,
      }),
    });
    if (!response.ok) throw new Error(`Mistral embed error: ${response.status}`);
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
      latency_p50: 700,
      latency_p95: 2800,
      latency_p99: 5500,
      errorRate: 0.4,
      requestsPerMin: 1200,
      tokensPerMin: 300_000,
      costPerToken: 0.000008,
      costPerRequest: 0.0015,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["mistral-large-2411", "mistral-small-latest", "mistral-medium-latest", "mistral-embed"],
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
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30_000);
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
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