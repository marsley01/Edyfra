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

export abstract class ModelProvider {
  public readonly name: string;
  protected config: ProviderConfig;

  constructor(name: string, config: ProviderConfig) {
    this.name = name;
    this.config = { ...config };
    this.validateConfig();
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`Provider "${this.name}": apiKey is required`);
    }
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  abstract completeStream(request: CompletionRequest): AsyncIterable<CompletionChunk>;

  abstract embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  abstract health(): Promise<ProviderHealth>;

  abstract metrics(): Promise<ProviderMetrics>;

  abstract capabilities(): Promise<ProviderCapabilities>;

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...partial };
    this.validateConfig();
  }
}