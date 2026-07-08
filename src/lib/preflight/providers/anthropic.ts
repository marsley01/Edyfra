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

interface AnthropicErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
}

export class AnthropicProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("ANTHROPIC", {
      baseUrl: "https://api.anthropic.com/v1",
      timeout: 60_000,
      maxRetries: 3,
      defaultModel: "claude-3-5-sonnet-20241022",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();

    const systemMessages = request.messages.filter((m) => m.role === "system");
    const nonSystemMessages = request.messages.filter((m) => m.role !== "system");

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.fetch("/messages", {
          method: "POST",
          body: JSON.stringify({
            model: request.model ?? this.config.defaultModel ?? "claude-3-5-sonnet-20241022",
            max_tokens: request.maxTokens ?? 8192,
            system: systemMessages.map((m) => m.content).join("\n") || undefined,
            messages: nonSystemMessages.map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
            temperature: request.temperature,
            top_p: request.topP,
            top_k: request.topK,
            stop_sequences: request.stopSequences,
          }),
        }, startTime);

        if (!response.ok) {
          const errorBody = JSON.parse(await response.text().catch(() => "{}")) as AnthropicErrorResponse;
          throw new Error(errorBody?.error?.message ?? `Anthropic error (${response.status})`);
        }

        const data = JSON.parse(await response.text()) as {
          id: string;
          model: string;
          content: { text: string }[];
          stop_reason: string;
          usage: { input_tokens: number; output_tokens: number };
        };

        return {
          id: data.id,
          model: data.model,
          content: data.content.map((c) => c.text).join(""),
          finishReason: data.stop_reason === "end_turn" ? "stop" : "length",
          usage: {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          },
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

    throw new Error("Anthropic: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const systemMessages = request.messages.filter((m) => m.role === "system");
    const nonSystemMessages = request.messages.filter((m) => m.role !== "system");

    const response = await this.fetch("/messages", {
      method: "POST",
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel ?? "claude-3-5-sonnet-20241022",
        max_tokens: request.maxTokens ?? 8192,
        system: systemMessages.map((m) => m.content).join("\n") || undefined,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        temperature: request.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Anthropic: no response body");

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
        if (!trimmed.startsWith("data: ")) continue;
        if (trimmed === "data: [DONE]") continue;

        try {
          const event = JSON.parse(trimmed.slice(6));
          if (event.type === "content_block_delta" && event.delta?.text) {
            yield {
              id: event.message?.id ?? "unknown",
              model: event.model ?? "claude-3-5-sonnet",
              content: event.delta.text,
              finishReason: null,
            };
          }
          if (event.type === "message_stop" || event.type === "message_complete") {
            yield {
              id: event.message?.id ?? "unknown",
              model: event.model ?? "claude-3-5-sonnet",
              content: "",
              finishReason: "stop",
            };
          }
        } catch {
          // skip
        }
      }
    }
  }

  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error("Anthropic does not support embeddings. Use OpenAI or Google.");
  }

  async health(): Promise<ProviderHealth> {
    try {
      const startTime = performance.now();
      const response = await this.fetch("/models", { method: "GET" }, startTime);
      const latency = performance.now() - startTime;

      if (response.ok) {
        return {
          status: ProviderStatus.AVAILABLE,
          lastCheck: new Date().toISOString(),
          uptime: 0,
          errorCount: 0,
          avgLatency: latency,
        };
      }

      return {
        status: response.status === 429 ? ProviderStatus.RATE_LIMITED : ProviderStatus.DEGRADED,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorCount: 1,
        avgLatency: latency,
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
      latency_p50: 1200,
      latency_p95: 4000,
      latency_p99: 8000,
      errorRate: 0.3,
      requestsPerMin: 500,
      tokensPerMin: 200_000,
      costPerToken: 0.000015,
      costPerRequest: 0.003,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
      maxTokens: 8192,
      streamingSupport: true,
      functionCalling: true,
      vision: true,
      embedding: false,
      contextWindow: 200_000,
    };
  }

  private async fetch(path: string, init: RequestInit, _startTime?: number): Promise<Response> {
    const baseUrl = this.config.baseUrl ?? "https://api.anthropic.com/v1";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 60_000);

    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
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
      const msg = error.message;
      return msg.includes("Timeout") || msg.includes("429") || msg.includes("rate_limit") || msg.includes("overloaded");
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}