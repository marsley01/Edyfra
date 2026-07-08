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

export class LlamaProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("LLAMA", {
      baseUrl: "https://api.meta.com/llama/v1",
      timeout: 60_000,
      maxRetries: 2,
      defaultModel: "llama-3.1-70b",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "llama-3.1-70b";

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 2); attempt++) {
      try {
        const response = await this.fetch("/chat/completions", {
          method: "POST",
          body: JSON.stringify({
            model,
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: request.temperature,
            top_p: request.topP,
            max_tokens: request.maxTokens,
            stop: request.stopSequences,
          }),
        });

        if (!response.ok) {
          throw new Error(`Llama API error (${response.status})`);
        }

        const data = (await response.json()) as {
          id: string;
          model: string;
          choices: {
            message: { content: string };
            finish_reason: string;
          }[];
          usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
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
        if (attempt < (this.config.maxRetries ?? 2) && this.isRetryable(error)) {
          await this.delay(2 ** attempt * 1000);
          continue;
        }
        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new Error("Llama: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "llama-3.1-70b";

    const response = await this.fetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Llama stream error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Llama: no response body");

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

  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error("Llama embeddings not yet supported via this provider");
  }

  async health(): Promise<ProviderHealth> {
    try {
      const response = await this.fetch("/models", { method: "GET" });
      return {
        status: response.ok ? ProviderStatus.AVAILABLE : ProviderStatus.DEGRADED,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorCount: response.ok ? 0 : 1,
        avgLatency: 300,
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
      latency_p50: 900,
      latency_p95: 3500,
      latency_p99: 7000,
      errorRate: 0.6,
      requestsPerMin: 800,
      tokensPerMin: 150_000,
      costPerToken: 0.000002,
      costPerRequest: 0.0002,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["llama-3.1-405b", "llama-3.1-70b", "llama-3.1-8b"],
      maxTokens: 4096,
      streamingSupport: true,
      functionCalling: true,
      vision: false,
      embedding: false,
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
      return error.message.includes("Timeout") || error.message.includes("429") || error.message.includes("503");
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}