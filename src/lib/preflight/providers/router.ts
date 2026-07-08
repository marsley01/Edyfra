import { ModelProvider } from "./provider";
import type {
  RoutingRule,
  RoutingCondition,
  RoutingResult,
  ProviderMetrics,
  ProviderHealth,
} from "./types";
import { ProviderStatus } from "./types";
import type { ModelCapability } from "@agent-preflight/types";

type ProviderEntry = {
  name: string;
  provider: ModelProvider;
  metrics: ProviderMetrics | null;
  health: ProviderHealth | null;
};

export class ModelRouter {
  private providers: Map<string, ProviderEntry> = new Map();
  private rules: RoutingRule[] = [];

  registerProvider(name: string, provider: ModelProvider): void {
    this.providers.set(name, {
      name,
      provider,
      metrics: null,
      health: null,
    });
  }

  unregisterProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  setRules(rules: RoutingRule[]): void {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async routeByCapability(requiredCapabilities: ModelCapability[]): Promise<RoutingResult> {
    for (const rule of this.rules) {
      if (this.matchesCapabilities(rule.condition, requiredCapabilities)) {
        const entry = this.providers.get(rule.targetProvider);
        if (entry) {
          return {
            provider: rule.targetProvider,
            model: rule.targetModel,
            reason: `capability match via rule "${rule.name}"`,
          };
        }
      }
    }

    // Default routing by capability
    if (requiredCapabilities.includes("REASONING")) {
      return this.routeTo("ANTHROPIC", "claude-3-5-sonnet-20241022", "reasoning tasks");
    }
    if (requiredCapabilities.includes("CODING")) {
      return this.routeTo("OPENAI", "gpt-4o", "coding tasks");
    }
    if (requiredCapabilities.includes("VISION") || requiredCapabilities.includes("LONG_CONTEXT")) {
      return this.routeTo("GOOGLE", "gemini-2.0-flash", "vision / long context");
    }
    if (requiredCapabilities.includes("CHEAP")) {
      return this.routeTo("LLAMA", "llama-3.1-70b", "low-cost inference");
    }
    if (requiredCapabilities.includes("FAST")) {
      return this.routeTo("GOOGLE", "gemini-2.0-flash", "low-latency inference");
    }

    return this.routeByAvailability();
  }

  async routeByCost(requiredCapabilities?: ModelCapability[]): Promise<RoutingResult> {
    let bestProvider: { name: string; cost: number } | null = null;
    let bestModel = "";

    for (const [name, entry] of this.providers) {
      if (entry.metrics === null) continue;
      const cost = entry.metrics.costPerToken + entry.metrics.costPerRequest;
      if (bestProvider === null || cost < bestProvider.cost) {
        const caps = await entry.provider.capabilities().catch(() => null);
        if (caps) {
          bestProvider = { name, cost };
          bestModel = caps.models[0] ?? "default";
        }
      }
    }

    if (bestProvider) {
      return this.routeTo(bestProvider.name, bestModel, "lowest cost provider");
    }
    return this.routeByAvailability();
  }

  async routeByLatency(): Promise<RoutingResult> {
    let fastest: { name: string; latency: number } | null = null;
    let fastestModel = "";

    for (const [name, entry] of this.providers) {
      if (entry.metrics === null) continue;
      if (fastest === null || entry.metrics.latency_p50 < fastest.latency) {
        fastest = { name, latency: entry.metrics.latency_p50 };
        const caps = await entry.provider.capabilities().catch(() => null);
        if (caps) {
          fastestModel = caps.models[0] ?? "default";
        }
      }
    }

    if (fastest) {
      return this.routeTo(fastest.name, fastestModel, "fastest provider");
    }
    return this.routeByAvailability();
  }

  async routeByAvailability(): Promise<RoutingResult> {
    for (const [name, entry] of this.providers) {
      const health = entry.health ?? (await entry.provider.health().catch(() => null));
      if (health && health.status === ProviderStatus.AVAILABLE) {
        const caps = await entry.provider.capabilities().catch(() => null);
        return {
          provider: name,
          model: caps?.models[0] ?? "default",
          reason: "first available provider",
        };
      }
    }

    // Fallback: try any registered provider
    for (const [name] of this.providers) {
      const caps = await this.providers.get(name)!.provider.capabilities().catch(() => null);
      return {
        provider: name,
        model: caps?.models[0] ?? "default",
        reason: "fallback to any registered provider",
      };
    }

    throw new Error("ModelRouter: no providers registered");
  }

  async routeWithFallback(
    primaryCondition: RoutingCondition,
    fallbackCount = 2,
  ): Promise<RoutingResult> {
    const candidates: RoutingResult[] = [];

    // Try primary routing strategies
    if (primaryCondition.requiredCapabilities && primaryCondition.requiredCapabilities.length > 0) {
      candidates.push(await this.routeByCapability(primaryCondition.requiredCapabilities));
    }

    if (primaryCondition.maxCost !== undefined) {
      candidates.push(await this.routeByCost(primaryCondition.requiredCapabilities));
    }

    if (primaryCondition.maxLatency !== undefined) {
      candidates.push(await this.routeByLatency());
    }

    candidates.push(await this.routeByAvailability());

    // Test each in order
    for (const candidate of candidates) {
      const entry = this.providers.get(candidate.provider);
      if (!entry) continue;

      const health = await entry.provider.health().catch(() => null);
      if (health && health.status === ProviderStatus.AVAILABLE) {
        return candidate;
      }
    }

    // Final fallback
    return this.routeByAvailability();
  }

  async refreshMetrics(): Promise<void> {
    for (const [, entry] of this.providers) {
      entry.metrics = await entry.provider.metrics().catch(() => null);
      entry.health = await entry.provider.health().catch(() => null);
    }
  }

  private matchesCapabilities(condition: RoutingCondition, required: ModelCapability[]): boolean {
    if (!condition.requiredCapabilities || condition.requiredCapabilities.length === 0) {
      return false;
    }
    return condition.requiredCapabilities.every((cap) => required.includes(cap));
  }

  private routeTo(provider: string, model: string, reason: string): RoutingResult {
    return { provider, model, reason };
  }
}