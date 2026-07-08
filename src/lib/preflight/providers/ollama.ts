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

export class OllamaProvider extends ModelProvider {
  constructor(config: ProviderConfig) {
    super("OLLAMA", {
      baseUrl: config.baseUrl ?? "http://localhost:11434",
      timeout: 120_000,
      maxRetries: 2,
      defaultModel: "llama3.1",
      ...config,
      apiKey: config.apiKey ?? "ollama-local",
    });
  }

  override validateConfig(): void {
    if (!this.config.baseUrl) {
      this.config.baseUrl = "http://localhost:11434";
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();
    const model = request.model ?? this.config.defaultModel ?? "llama3.1";

    const response = await this.fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        options: {
          temperature: request.temperature,
          top_p: request.topP,
          num_predict: request.maxTokens,
          stop: request.stopSequences,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      model: string;
      message: { content: string };
      done: boolean;
      done_reason: string;
      eval_count?: number;
    };

    return {
      id: `ollama-${Date.now()}`,
      model: data.model,
      content: data.message.content,
      finishReason: data.done ? "stop" : "length",
      usage: {
        inputTokens: 0,
        outputTokens: data.eval_count ?? 0,
        totalTokens: data.eval_count ?? 0,
      },
      latency: performance.now() - startTime,
    };
  }

  async *completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const model = request.model ?? this.config.defaultModel ?? "llama3.1";

    const response = await this.fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
        options: { temperature: request.temperature },
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Ollama stream error: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Ollama: no response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as {
            model: string;
            message?: { content: string };
            done: boolean;
          };
          const content = json.message?.content ?? "";
          yield {
            id: `ollama-${Date.now()}`,
            model: json.model,
            content,
            finishReason: json.done ? "stop" : null,
          };
        } catch {
          // skip
        }
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = performance.now();
    const model = request.model ?? "nomic-embed-text";
    const input = typeof request.input === "string" ? [request.input] : request.input;

    const embeddings: number[][] = [];
    let totalInputTokens = 0;

    for (const text of input) {
      const response = await this.fetch("/api/embeddings", {
        method: "POST",
        body: JSON.stringify({ model, prompt: text }),
      });
      if (!response.ok) throw new Error(`Ollama embed error: ${response.status}`);
      const data = (await response.json()) as { embedding: number[] };
      embeddings.push(data.embedding);
    }

    return {
      model,
      embeddings,
      usage: { inputTokens: totalInputTokens, totalTokens: totalInputTokens },
      latency: performance.now() - startTime,
    };
  }

  async health(): Promise<ProviderHealth> {
    try {
      const startTime = performance.now();
      const response = await this.fetch("/api/tags", { method: "GET" });
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
      latency_p50: 2000,
      latency_p95: 8000,
      latency_p99: 15000,
      errorRate: 1.0,
      requestsPerMin: 100,
      tokensPerMin: 50_000,
      costPerToken: 0,
      costPerRequest: 0,
    };
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      models: ["llama3.1", "llama3", "mistral", "mixtral", "codellama", "nomic-embed-text"],
      maxTokens: 4096,
      streamingSupport: true,
      functionCalling: false,
      vision: false,
      embedding: true,
      contextWindow: 8192,
    };
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout ?? 120_000);
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
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
}