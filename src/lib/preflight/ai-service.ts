import { ModelRouter, OpenRouterProvider, GoogleProvider, ProviderFactory } from "@agent-preflight/providers";
import type { RoutingResult, CompletionMessage, CompletionRequest, ModelProvider, RoutingRule } from "@agent-preflight/providers";
import type { ModelCapability } from "@agent-preflight/types";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

export interface EdyfraAIConfig {
  openrouterKey?: string;
  googleKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  appUrl?: string;
  appName?: string;
}

export interface CompletionOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  requiredCapabilities?: ModelCapability[];
  systemPrompt?: string;
}

export class EdyfraAIService {
  private router: ModelRouter;
  private factory: ProviderFactory;
  private providers = new Map<string, ModelProvider>();
  private config: EdyfraAIConfig;
  private ready = false;

  constructor(config: EdyfraAIConfig) {
    this.config = config;
    this.factory = new ProviderFactory();
    this.router = new ModelRouter();
  }

  async initialize(): Promise<void> {
    const { openrouterKey, googleKey, appUrl, appName } = this.config;

    if (openrouterKey) {
      const orProvider = new OpenRouterProvider({
        apiKey: openrouterKey,
        organization: appUrl,
        defaultModel: this.config.defaultModel || DEFAULT_MODEL,
      });
      this.router.registerProvider("openrouter", orProvider);
      this.providers.set("openrouter", orProvider);
      this.factory.createProvider("OPENROUTER", { apiKey: openrouterKey, organization: appUrl });
    }

    if (googleKey) {
      const gProvider = new GoogleProvider({
        apiKey: googleKey,
        defaultModel: "gemini-2.5-flash",
      });
      this.router.registerProvider("google", gProvider);
      this.providers.set("google", gProvider);
      this.factory.createProvider("GOOGLE", { apiKey: googleKey });
    }

    if (!openrouterKey && !googleKey) {
      console.warn("[EdyfraAIService] No API keys configured.");
    }

    const rules: RoutingRule[] = [
      {
        id: "fast-default",
        name: "Fast default - OpenRouter GPT-4o-mini",
        priority: 10,
        condition: { requiredCapabilities: ["FAST"] },
        targetProvider: "openrouter",
        targetModel: "openai/gpt-4o-mini",
      },
      {
        id: "reasoning",
        name: "Reasoning tasks - OpenRouter Claude",
        priority: 20,
        condition: { requiredCapabilities: ["REASONING"] },
        targetProvider: "openrouter",
        targetModel: "anthropic/claude-3.5-sonnet",
      },
      {
        id: "economy",
        name: "Low cost - Gemini Flash",
        priority: 5,
        condition: { requiredCapabilities: ["CHEAP"] },
        targetProvider: "google",
        targetModel: "gemini-2.5-flash",
      },
    ];
    this.router.setRules(rules);
    this.ready = true;
  }

  async generateCompletion(
    prompt: string,
    systemPrompt = "You are an expert educational assistant.",
    options: CompletionOptions = {},
  ): Promise<string> {
    if (!this.ready) await this.initialize();

    const messages: CompletionMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    let route: RoutingResult | null = null;
    if (options.requiredCapabilities && options.requiredCapabilities.length > 0) {
      route = await this.router.routeByCapability(options.requiredCapabilities);
    } else {
      route = await this.router.routeByAvailability();
    }

    const fallbackRoute = await this.router.routeByAvailability();
    const targetProvider = options.provider || route?.provider || fallbackRoute.provider;
    const model = options.model || route?.model || fallbackRoute.model || DEFAULT_MODEL;

    const provider = this.providers.get(targetProvider);
    if (!provider) {
      return this.fallbackCompletion(messages, options);
    }

    try {
      const request: CompletionRequest = {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4096,
      };
      const response = await provider.complete(request);
      return response.content;
    } catch {
      return await this.fallbackCompletion(messages, options);
    }
  }

  async generateJSON(
    prompt: string,
    schema?: Record<string, unknown>,
    options: CompletionOptions = {},
  ): Promise<Record<string, unknown>> {
    const systemPrompt = "You are a specialized assistant that returns ONLY valid JSON. No markdown, no commentary.";
    try {
      const text = await this.generateCompletion(prompt, systemPrompt, options);
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("[EdyfraAIService] JSON generation error:", error);
      return schema || { error: "Failed to generate valid JSON" };
    }
  }

  async generateWithFallback(
    prompt: string,
    systemPrompt: string,
    options: CompletionOptions = {},
  ): Promise<string> {
    try {
      return await this.generateCompletion(prompt, systemPrompt, {
        ...options,
        requiredCapabilities: options.requiredCapabilities || ["FAST"],
      });
    } catch {
      try {
        return await this.generateCompletion(prompt, systemPrompt, {
          ...options,
          requiredCapabilities: ["CHEAP"],
        });
      } catch {
        return "I'm having a bit of trouble thinking right now. Let's try again in a moment.";
      }
    }
  }

  getRouter(): ModelRouter {
    return this.router;
  }

  getFactory(): ProviderFactory {
    return this.factory;
  }

  private async fallbackCompletion(
    messages: CompletionMessage[],
    options: CompletionOptions,
  ): Promise<string> {
    for (const [name, provider] of this.providers) {
      try {
        const request: CompletionRequest = {
          model: options.model || DEFAULT_MODEL,
          messages,
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 4096,
        };
        const response = await provider.complete(request);
        return response.content;
      } catch {
        continue;
      }
    }
    return "I'm having a bit of trouble thinking right now. Let's try again in a moment.";
  }
}
