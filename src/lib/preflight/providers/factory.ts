import { ModelProvider } from "./provider";
import type { ProviderConfig } from "./types";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { LlamaProvider } from "./llama";
import { MistralProvider } from "./mistral";
import { DeepSeekProvider } from "./deepseek";
import { OpenRouterProvider } from "./openrouter";
import { OllamaProvider } from "./ollama";

type ProviderConstructor = new (config: ProviderConfig) => ModelProvider;

export class ProviderFactory {
  private registry: Map<string, ProviderConstructor> = new Map();
  private instances: Map<string, ModelProvider> = new Map();

  constructor() {
    this.registerBuiltIns();
  }

  private registerBuiltIns(): void {
    this.registry.set("OPENAI", OpenAIProvider);
    this.registry.set("ANTHROPIC", AnthropicProvider);
    this.registry.set("GOOGLE", GoogleProvider);
    this.registry.set("LLAMA", LlamaProvider);
    this.registry.set("MISTRAL", MistralProvider);
    this.registry.set("DEEPSEEK", DeepSeekProvider);
    this.registry.set("OPENROUTER", OpenRouterProvider);
    this.registry.set("OLLAMA", OllamaProvider);
  }

  createProvider(name: string, config: ProviderConfig): ModelProvider {
    const Constructor = this.registry.get(name.toUpperCase());
    if (!Constructor) {
      throw new Error(
        `ProviderFactory: unknown provider "${name}". Available: ${Array.from(this.registry.keys()).join(", ")}`,
      );
    }

    const instance = new Constructor(config);
    this.instances.set(name.toUpperCase(), instance);
    return instance;
  }

  getProvider(name: string): ModelProvider | undefined {
    return this.instances.get(name.toUpperCase());
  }

  getAvailableProviders(): { name: string; provider: ModelProvider }[] {
    return Array.from(this.instances.entries()).map(([name, provider]) => ({
      name,
      provider,
    }));
  }

  registerProvider(name: string, constructor: ProviderConstructor): void {
    this.registry.set(name.toUpperCase(), constructor);
  }

  hasProvider(name: string): boolean {
    return this.registry.has(name.toUpperCase());
  }

  removeInstance(name: string): boolean {
    return this.instances.delete(name.toUpperCase());
  }

  clearInstances(): void {
    this.instances.clear();
  }

  listRegisteredProviders(): string[] {
    return Array.from(this.registry.keys());
  }
}