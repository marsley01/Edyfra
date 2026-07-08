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

interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class OpenAIProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("OPENAI", {
      baseUrl: "https://api.openai.com/v1",
      timeout: 30_000,
      maxRetries: 3,
      ...config,
    });
  }

  override async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const lastError: Error = new Error("Failed after all retries");

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.fetch("/chat/completions", {
          method: "POST",
          body: JSON.stringify({
            model: request.model ?? this.config.defaultModel ?? "gpt-4o",
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
              ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
            })),
            temperature: request.temperature,
            top_p: request.topP,
            max_tokens: request.maxTokens,
            stop: request.stopSequences,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            tools: request.tools?.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
          throw this.mapError(response.status, errorBody);
        }

        const text = await response.text();
        const data = JSON.parse(text) as {
          id: string;
          model: string;
          choices: {
            message: {
              content: string | null;
              tool_calls?: {
                id: string;
                type: "function";
                function: { name: string; arguments: string };
              }[];
            };
            finish_reason: string;
          }[];
          usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        };

        const choice = data.choices[0];
        if (!choice) {
          throw new Error("OpenAI: empty choices in response");
        }

        return {
          id: data.id,
          model: data.model,
          content: choice.message.content ?? "",
          finishReason: this.mapFinishReason(choice.finish_reason) as CompletionResponse["finishReason"],
          toolCalls: choice.message.tool_calls?.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
          usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
          latency: performance.now() - startTime,
        };
      } catch (error) {
        lastError.cause = error instanceof Error ? error : new Error(String(error));
        if (attempt < (this.config.maxRetries ?? 3) && this.isRetryable(error)) {
          await this.delay(2 ** attempt * 1000);
          continue;
        }
        throw lastError.cause ?? lastError;
      }
    }

    throw lastError;
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const response = await this.fetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: request.model ?? this.config.defaultModel ?? "gpt-4o",
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
      throw this.mapError(response.status, errorBody);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("OpenAI: no response body for streaming");
    }

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
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as {
            id: string;
            model: string;
            choices: {
              delta: { content?: string };
              finish_reason: string | null;
            }[];
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          };

          const choice = json.choices[0];
          if (!choice) continue;

          yield {
            id: json.id,
            model: json.model,
            content: choice.delta.content ?? "",
            finishReason: (choice.finish_reason === null ? null : this.mapFinishReason(choice.finish_reason)) as CompletionChunk["finishReason"],
            usage: json.usage
              ? {
                  inputTokens: json.usage.prompt_tokens,
                  outputTokens: json.usage.completion_tokens,
                  totalTokens: json.usage.total_tokens,
                }
              : undefined,
          };
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = performance.now();
    const response = await this.fetch("/embeddings", {
      method: "POST",
      body: JSON.stringify({
        model: request.model ?? "text-embedding-3-small",
        input: request.input,
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
      throw this.mapError(response.status, errorBody);
    }

    const text = await response.text();
    const data = JSON.parse(text) as {
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
      const startTime = performance.now();
      const response = await this.fetch("/models", { method: "GET" });
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

      if (response.status === 429) {
        return {
          status: ProviderStatus.RATE_LIMITED,
          lastCheck: new Date().toISOString(),
          uptime: 0,
          errorCount: 1,
          avgLatency: latency,
        };
      }

      return {
        status: ProviderStatus.DEGRADED,
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
      latency_p50: 800,
      latency_p95: 3000,
      latency_p99: 6000,
      errorRate: 0.5,
      requestsPerMin: 1000,
      tokensPerMin: 100_000,
      costPerToken: 0.00001,
      costPerRequest: 0.001,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "text-embedding-3-small", "text-embedding-3-large"],
      maxTokens: 16_384,
      streamingSupport: true,
      functionCalling: true,
      vision: true,
      embedding: true,
      contextWindow: 128_000,
    };
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const baseUrl = this.config.baseUrl ?? "https://api.openai.com/v1";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30_000);

    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization
            ? { "OpenAI-Organization": this.config.organization }
            : {}),
          ...(init.headers as Record<string, string> ?? {}),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapError(status: number, body: OpenAIErrorResponse): Error {
    const message = body.error?.message ?? `OpenAI API error (status ${status})`;
    const code = body.error?.code ?? "OPENAI_ERROR";
    const err = new Error(message);
    err.name = `OpenAI${code}`;
    return err;
  }

  private mapFinishReason(reason: string): CompletionResponse["finishReason"] {
    switch (reason) {
      case "stop": return "stop";
      case "length": return "length";
      case "tool_calls": return "tool_calls";
      default: return "error";
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error && "name" in error) {
      const name = (error as Error).name;
      return name.includes("Timeout") || name.includes("RateLimit") || name.includes("429");
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}