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

interface GeminiErrorBody {
  error?: {
    message?: string;
    code?: number;
    status?: string;
  };
}

export class GoogleProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("GOOGLE", {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      timeout: 30_000,
      maxRetries: 3,
      defaultModel: "gemini-2.0-flash",
      ...config,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "gemini-2.0-flash";

    const contents = this.buildGeminiContents(request.messages);
    const systemInstruction = request.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");

    const body: Record<string, unknown> = {
      contents,
      generationConfig: this.buildGenerationConfig(request),
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.fetch(
          `/models/${model}:generateContent?key=${this.config.apiKey}`,
          {
            method: "POST",
            body: JSON.stringify(body),
          },
        );

        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as GeminiErrorBody;
          throw new Error(errBody?.error?.message ?? `Gemini error (${response.status})`);
        }

        const data = (await response.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
          };
        };

        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error("Gemini: no candidates in response");

        return {
          id: `gemini-${Date.now()}`,
          model,
          content: candidate.content?.parts?.map((p) => p.text ?? "").join("") ?? "",
          finishReason: this.mapFinishReason(candidate.finishReason ?? "") as CompletionResponse["finishReason"],
          usage: {
            inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
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

    throw new Error("Gemini: max retries exceeded");
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "gemini-2.0-flash";
    const contents = this.buildGeminiContents(request.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: this.buildGenerationConfig(request),
    };

    const response = await this.fetch(
      `/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!response.ok) throw new Error(`Gemini stream error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Gemini: no response body");

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
          const json = JSON.parse(trimmed.slice(6));
          const candidate = json.candidates?.[0];
          if (!candidate) continue;

          const text = candidate.content?.parts?.[0]?.text ?? "";
          yield {
            id: `gemini-${Date.now()}`,
            model,
            content: text,
            finishReason: (candidate.finishReason ? (this.mapFinishReason(candidate.finishReason) as CompletionChunk["finishReason"]) : null) as CompletionChunk["finishReason"],
          };
        } catch {
          // skip
        }
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = performance.now();
    const model = request.model ?? "text-embedding-004";
    const input = typeof request.input === "string" ? [request.input] : request.input;

    const response = await this.fetch(
      `/models/${model}:embedContent?key=${this.config.apiKey}`,
      {
        method: "POST",
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: input[0] }] },
        }),
      },
    );

    if (!response.ok) throw new Error(`Gemini embed error: ${response.status}`);

    const data = (await response.json()) as {
      embedding?: { values?: number[] };
    };

    return {
      model,
      embeddings: [data.embedding?.values ?? []],
      usage: { inputTokens: 0, totalTokens: 0 },
      latency: performance.now() - startTime,
    };
  }

  async health(): Promise<ProviderHealth> {
    try {
      const startTime = performance.now();
      const response = await this.fetch(
        `/models?key=${this.config.apiKey}`,
        { method: "GET" },
      );
      const latency = performance.now() - startTime;

      return {
        status: response.ok ? ProviderStatus.AVAILABLE : ProviderStatus.DEGRADED,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        errorCount: response.ok ? 0 : 1,
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
      latency_p50: 600,
      latency_p95: 2500,
      latency_p99: 5000,
      errorRate: 0.4,
      requestsPerMin: 1500,
      tokensPerMin: 400_000,
      costPerToken: 0.000005,
      costPerRequest: 0.0005,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro", "gemini-1.5-flash", "text-embedding-004"],
      maxTokens: 8192,
      streamingSupport: true,
      functionCalling: true,
      vision: true,
      embedding: true,
      contextWindow: 1_000_000,
    };
  }

  private buildGeminiContents(messages: CompletionRequest["messages"]) {
    const nonSystem = messages.filter((m) => m.role !== "system");
    return nonSystem.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  }

  private buildGenerationConfig(request: CompletionRequest): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    if (request.temperature !== undefined) config.temperature = request.temperature;
    if (request.topP !== undefined) config.topP = request.topP;
    if (request.topK !== undefined) config.topK = request.topK;
    if (request.maxTokens !== undefined) config.maxOutputTokens = request.maxTokens;
    if (request.stopSequences) config.stopSequences = request.stopSequences;
    return config;
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const baseUrl = this.config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 30_000);

    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers as Record<string, string> ?? {}),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapFinishReason(reason: string): CompletionResponse["finishReason"] {
    const map: Record<string, CompletionResponse["finishReason"]> = {
      STOP: "stop",
      MAX_TOKENS: "length",
      SAFETY: "error",
      RECITATION: "error",
      OTHER: "error",
    };
    return map[reason] ?? "error";
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes("Timeout") || error.message.includes("429") || error.message.includes("quota");
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}