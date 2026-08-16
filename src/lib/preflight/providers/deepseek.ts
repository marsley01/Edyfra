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

export class DeepSeekProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("DEEPSEEK", {
      baseUrl: "https://api.deepseek.com",
      timeout: 60_000,
      maxRetries: 3,
      defaultModel: "deepseek-chat",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "deepseek-chat";

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.fetch("/v1/chat/completions", {
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

        if (!response.ok) throw new Error(`DeepSeek error (${response.status})`);

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
    throw new Error("DeepSeek: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "deepseek-chat";
    const response = await this.fetch("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model, messages: request.messages, stream: true }),
    });
    if (!response.ok) throw new Error(`DeepSeek stream error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("DeepSeek: no response body");
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
    throw new Error("DeepSeek does not support embeddings");
  }

  async health(): Promise<ProviderHealth> {
    try {
      const response = await this.fetch("/v1/models", { method: "GET" });
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
      latency_p50: 1000,
      latency_p95: 4000,
      latency_p99: 8000,
      errorRate: 0.5,
      requestsPerMin: 600,
      tokensPerMin: 200_000,
      costPerToken: 0.000001,
      costPerRequest: 0.0001,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"],
      maxTokens: 8192,
      streamingSupport: true,
      functionCalling: true,
      vision: false,
      embedding: false,
      contextWindow: 1_000_000,
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