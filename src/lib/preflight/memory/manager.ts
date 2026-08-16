import type {
  MemoryLayer,
  AgentId,
  Duration,
} from '@agent-preflight/types';
import type {
  MemoryEntryMeta,
  MemoryQuery,
  MemorySearchResponse,
  MemorySearchResult,
  MemoryStats,
  MemoryEvent,
} from './types';
import type { MemoryStore, SaveOptions, OptimizeResult } from './store';
import { WorkingMemory } from './working';
import type { WorkingMemoryConfig } from './working';
import { SessionMemory } from './session';
import type { SessionMemoryConfig } from './session';
import { LongTermMemory } from './longterm';
import type { LongTermMemoryConfig } from './longterm';
import { SemanticMemory } from './semantic';
import type { SemanticMemoryConfig } from './semantic';
import { VectorMemory } from './vector';
import type { VectorMemoryConfig } from './vector';
import { KnowledgeGraph } from './knowledge';
import type { KnowledgeGraphConfig } from './knowledge';

// =============================================================================
// Memory Manager
// =============================================================================

/**
 * Configuration for the Memory Manager.
 */
export interface MemoryManagerConfig {
  /** Enable automatic routing between layers. */
  autoRouting: boolean;
  /** Enable cross-layer search. */
  crossLayerSearch: boolean;
  /** Interval for automatic consolidation (ms). */
  consolidationInterval: Duration;
  /** Whether to prefetch frequently accessed entries. */
  prefetchEnabled: boolean;
  /** Maximum number of prefetched entries. */
  prefetchMaxEntries: number;
  /** Whether to warm caches on startup. */
  cacheWarmingEnabled: boolean;
  /** Monitoring interval for usage statistics (ms). */
  monitoringInterval: Duration;
}

const DEFAULT_MANAGER_CONFIG: MemoryManagerConfig = {
  autoRouting: true,
  crossLayerSearch: true,
  consolidationInterval: 60_000, // 1 minute
  prefetchEnabled: true,
  prefetchMaxEntries: 100,
  cacheWarmingEnabled: true,
  monitoringInterval: 30_000, // 30 seconds
};

/**
 * Layer-specific configuration for the Memory Manager.
 */
export interface AllLayerConfigs {
  working?: Partial<WorkingMemoryConfig> | undefined;
  session?: Partial<SessionMemoryConfig> | undefined;
  longTerm?: Partial<LongTermMemoryConfig> | undefined;
  semantic?: Partial<SemanticMemoryConfig> | undefined;
  vector?: Partial<VectorMemoryConfig> | undefined;
  knowledgeGraph?: Partial<KnowledgeGraphConfig> | undefined;
}

/**
 * Memory Manager — orchestrates all memory layers.
 *
 * Provides a unified interface to the multi-layer memory system, with
 * automatic query routing, cross-layer search, consolidation scheduling,
 * cache warming, and usage monitoring.
 *
 * Features:
 * - Automatic routing between layers based on query type and intent
 * - Cross-layer search with deduplicated, ranked results
 * - Scheduled memory consolidation and archiving
 * - Cache warming and prefetching for hot entries
 * - Memory usage monitoring and optimisation
 * - Event emission for observability
 */
export class MemoryManager implements MemoryStore {
  public readonly layers: {
    working: WorkingMemory;
    session: SessionMemory;
    longTerm: LongTermMemory;
    semantic: SemanticMemory;
    vector: VectorMemory;
    knowledgeGraph: KnowledgeGraph;
  };

  private readonly config: MemoryManagerConfig;
  private readonly listeners = new Map<MemoryEvent['type'], Set<(event: MemoryEvent) => void>>();
  private monitoringTimer: ReturnType<typeof setInterval> | null = null;
  private consolidationTimer: ReturnType<typeof setInterval> | null = null;
  private prefetchCache = new Map<string, { meta: MemoryEntryMeta; value: unknown }>();
  private accessCounters = new Map<string, number>();

  constructor(
    config?: Partial<MemoryManagerConfig> | undefined,
    layerConfigs?: AllLayerConfigs | undefined,
  ) {
    this.config = { ...DEFAULT_MANAGER_CONFIG, ...config };

    this.layers = {
      working: new WorkingMemory(layerConfigs?.working),
      session: new SessionMemory(layerConfigs?.session),
      longTerm: new LongTermMemory(layerConfigs?.longTerm),
      semantic: new SemanticMemory(layerConfigs?.semantic),
      vector: new VectorMemory(layerConfigs?.vector),
      knowledgeGraph: new KnowledgeGraph(layerConfigs?.knowledgeGraph),
    };

    if (this.config.cacheWarmingEnabled) {
      this.warmCaches().catch(() => {});
    }

    this.startMonitoring();
    this.startConsolidation();
  }

  // ---------------------------------------------------------------------------
  // MemoryStore Implementation
  // ---------------------------------------------------------------------------

  async save(
    layer: MemoryLayer,
    key: string,
    value: unknown,
    options?: SaveOptions | undefined,
  ): Promise<MemoryEntryMeta> {
    const store = this.resolveStore(layer);
    const meta = await store.save(layer, key, value, options);
    this.updatePrefetchCache(key, meta, value);
    this.emit('ENTRY_CREATED', layer, meta.agentId, meta.id);
    return meta;
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    // Check prefetch cache first
    const cacheKey = `${layer}::${key}`;
    const cached = this.prefetchCache.get(cacheKey);
    if (cached) {
      this.incrementAccess(cacheKey);
      return cached;
    }

    const store = this.resolveStore(layer);
    const result = await store.get(layer, key);

    if (result) {
      this.maybePrefetch(key, result.meta, result.value);
    }

    return result;
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    if (!this.config.crossLayerSearch) {
      // Single-layer query
      if (query.layer) {
        const store = this.resolveStore(query.layer);
        return store.query(query);
      }
      // Default to working memory if no layer specified
      return this.layers.working.query({ ...query, layer: 'WORKING' });
    }

    // Cross-layer search
    const start = performance.now();
    const allResults: MemorySearchResult[] = [];
    let total = 0;

    const layersToSearch = this.determineLayersForQuery(query);

    for (const layerConfig of layersToSearch) {
      const store = this.resolveStore(layerConfig.layer);
      try {
        const response = await store.query({
          ...query,
          layer: layerConfig.layer,
          limit: layerConfig.limit,
        });

        for (const result of response.results) {
          // Boost score based on layer priority
          const boostedScore = Math.min(1, result.score * layerConfig.boost);
          allResults.push({
            ...result,
            score: boostedScore,
            explanation: `Matched in ${layerConfig.layer} layer (boost: ${layerConfig.boost})`,
          });
        }

        total += response.total;
      } catch {
        // Silently skip failing layers
      }
    }

    // Deduplicate by entry ID
    const seen = new Set<string>();
    const deduped = allResults.filter((r) => {
      if (seen.has(r.entry.id)) return false;
      seen.add(r.entry.id);
      return true;
    });

    // Sort by score
    deduped.sort((a, b) => b.score - a.score);

    const duration = performance.now() - start;
    return {
      results: deduped.slice(0, query.limit),
      total,
      query,
      duration,
    };
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    const store = this.resolveStore(layer);
    const result = await store.delete(layer, key);
    if (result) {
      this.prefetchCache.delete(`${layer}::${key}`);
      this.emit('ENTRY_DELETED', layer);
    }
    return result;
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    const store = this.resolveStore(layer);
    const count = await store.clear(layer, agentId);
    this.emit('LAYER_CLEARED', layer, agentId);
    return count;
  }

  async clearAll(): Promise<void> {
    for (const store of Object.values(this.layers)) {
      await store.clearAll();
    }
    this.prefetchCache.clear();
    this.accessCounters.clear();
  }

  async stats(): Promise<MemoryStats> {
    const allStats = await Promise.all(
      Object.values(this.layers).map((s) => s.stats()),
    );

    const merged: MemoryStats = {
      totalEntries: 0,
      totalSize: 0,
      byLayer: {},
      hitRate: 0,
      hits: 0,
      misses: 0,
      oldestEntry: null,
      newestEntry: null,
    };

    for (const stat of allStats) {
      merged.totalEntries += stat.totalEntries;
      merged.totalSize += stat.totalSize;
      merged.hits += stat.hits;
      merged.misses += stat.misses;

      for (const [layer, info] of Object.entries(stat.byLayer)) {
        merged.byLayer[layer as MemoryLayer] = info;
      }
    }

    const totalAccesses = merged.hits + merged.misses;
    merged.hitRate = totalAccesses > 0 ? (merged.hits / totalAccesses) * 100 : 100;

    return merged;
  }

  async optimize(): Promise<OptimizeResult> {
    const results = await Promise.all(
      Object.values(this.layers).map((s) => s.optimize()),
    );

    return results.reduce(
      (acc, r) => ({
        entriesExpired: acc.entriesExpired + r.entriesExpired,
        entriesEvicted: acc.entriesEvicted + r.entriesEvicted,
        bytesReclaimed: acc.bytesReclaimed + r.bytesReclaimed,
        duration: acc.duration + r.duration,
      }),
      { entriesExpired: 0, entriesEvicted: 0, bytesReclaimed: 0, duration: 0 },
    );
  }

  // ---------------------------------------------------------------------------
  // Manager-Specific Methods
  // ---------------------------------------------------------------------------

  /**
   * Save to the most appropriate layer based on query analysis.
   */
  async autoSave(
    key: string,
    value: unknown,
    options?: SaveOptions | undefined,
  ): Promise<MemoryEntryMeta> {
    if (!this.config.autoRouting) {
      return this.save('WORKING', key, value, options);
    }

    const layer = this.selectLayerForValue(value, options);
    return this.save(layer, key, value, options);
  }

  /**
   * Find the best matching layer for a given query and perform search.
   */
  async smartQuery(query: MemoryQuery): Promise<MemorySearchResponse> {
    return this.query(query);
  }

  /**
   * Get a summary of memory usage across all layers.
   */
  async getUsageReport(): Promise<MemoryUsageReport> {
    const stats = await this.stats();
    const config = this.config;

    return {
      stats,
      activeSessions: this.layers.session.listSessions().length,
      vectorCount: this.layers.vector.vectorCount(),
      prefetchCacheSize: this.prefetchCache.size,
      autoRouting: config.autoRouting,
      crossLayerSearch: config.crossLayerSearch,
      consolidationInterval: config.consolidationInterval,
    };
  }

  /**
   * Manually trigger consolidation across all layers.
   */
  async consolidateAll(): Promise<MemoryManagerConsolidationResult> {
    const working = await this.layers.working.optimize();
    const session = await this.layers.session.optimize();
    const longTerm = await this.layers.longTerm.consolidate();
    const result = await this.layers.longTerm.optimize();
    const semantic = await this.layers.semantic.optimize();
    const vector = await this.layers.vector.optimize();
    const knowledgeGraph = await this.layers.knowledgeGraph.optimize();

    this.emit('CONSOLIDATION_RUN', 'WORKING');
    this.emit('CONSOLIDATION_RUN', 'LONG_TERM');

    return {
      working,
      session,
      longTermConsolidation: longTerm,
      optimization: result,
      semantic,
      vector,
      knowledgeGraph,
    };
  }

  /**
   * Register an event listener.
   */
  on(eventType: MemoryEvent['type'], handler: (event: MemoryEvent) => void): void {
    let set = this.listeners.get(eventType);
    if (!set) {
      set = new Set();
      this.listeners.set(eventType, set);
    }
    set.add(handler);
  }

  /**
   * Remove an event listener.
   */
  off(eventType: MemoryEvent['type'], handler: (event: MemoryEvent) => void): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(handler);
    }
  }

  /**
   * Get the configuration.
   */
  getConfig(): MemoryManagerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime.
   */
  updateConfig(partial: Partial<MemoryManagerConfig>): void {
    Object.assign(this.config, partial);
    if (partial.monitoringInterval !== undefined) {
      this.startMonitoring();
    }
    if (partial.consolidationInterval !== undefined) {
      this.startConsolidation();
    }
  }

  /**
   * Clean up all timers.
   */
  dispose(): void {
    this.stopMonitoring();
    this.stopConsolidation();
  }

  // ---------------------------------------------------------------------------
  // Internal: Routing
  // ---------------------------------------------------------------------------

  private resolveStore(layer: MemoryLayer): MemoryStore {
    switch (layer) {
      case 'WORKING': return this.layers.working;
      case 'SESSION': return this.layers.session;
      case 'LONG_TERM': return this.layers.longTerm;
      case 'SEMANTIC': return this.layers.semantic;
      case 'VECTOR': return this.layers.vector;
      case 'KNOWLEDGE_GRAPH': return this.layers.knowledgeGraph;
      case 'PROJECT':
      case 'USER':
      case 'SHARED':
      case 'ENCRYPTED':
        return this.layers.longTerm; // Fallback for unimplemented layers
      default: {
        throw new Error(`Unknown memory layer: ${layer as string}`);
      }
    }
  }

  private selectLayerForValue(
    value: unknown,
    options?: SaveOptions | undefined,
  ): MemoryLayer {
    // If encryption requested, use ENCRYPTED (via long-term for now)
    if (options?.encrypt) {
      return 'ENCRYPTED';
    }

    // If session ID provided, use SESSION
    if (options?.sessionId) {
      return 'SESSION';
    }

    // If embedding provided, use SEMANTIC
    if (options?.embedding) {
      return 'SEMANTIC';
    }

    // If TTL is very short (< 10 min), use WORKING
    if (options?.ttl !== undefined && options.ttl !== null && options.ttl > 0 && options.ttl < 600_000) {
      return 'WORKING';
    }

    // If value is structured data with clear entity/relationship, use KNOWLEDGE_GRAPH
    if (this.isStructuredKnowledge(value)) {
      return 'KNOWLEDGE_GRAPH';
    }

    // Default to long-term for persistence
    return 'LONG_TERM';
  }

  private isStructuredKnowledge(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
      'subject' in obj &&
      'predicate' in obj &&
      'object' in obj
    ) || (
      'type' in obj &&
      'properties' in obj
    );
  }

  private determineLayersForQuery(query: MemoryQuery): { layer: MemoryLayer; limit: number; boost: number }[] {
    if (query.layer) {
      return [{ layer: query.layer, limit: query.limit, boost: 1.0 }];
    }

    const layers: { layer: MemoryLayer; limit: number; boost: number }[] = [];

    // Check for embedding-based queries
    if (query.embedding) {
      layers.push({ layer: 'SEMANTIC', limit: query.limit, boost: 1.0 });
      layers.push({ layer: 'VECTOR', limit: query.limit, boost: 0.9 });
    }

    // Check for tag-based queries
    if (query.tags && query.tags.length > 0) {
      layers.push({ layer: 'LONG_TERM', limit: query.limit, boost: 0.8 });
      layers.push({ layer: 'WORKING', limit: Math.ceil(query.limit / 2), boost: 1.0 });
    }

    // Text query
    if (query.query) {
      layers.push({ layer: 'WORKING', limit: Math.ceil(query.limit / 2), boost: 1.0 });
      layers.push({ layer: 'SESSION', limit: Math.ceil(query.limit / 2), boost: 0.9 });
      layers.push({ layer: 'LONG_TERM', limit: query.limit, boost: 0.7 });
    }

    // Default: search all primary layers
    if (layers.length === 0) {
      layers.push(
        { layer: 'WORKING', limit: Math.ceil(query.limit / 3), boost: 1.0 },
        { layer: 'SESSION', limit: Math.ceil(query.limit / 3), boost: 0.9 },
        { layer: 'LONG_TERM', limit: Math.ceil(query.limit / 3), boost: 0.7 },
      );
    }

    return layers;
  }

  // ---------------------------------------------------------------------------
  // Internal: Prefetching & Cache Warming
  // ---------------------------------------------------------------------------

  private maybePrefetch(
    key: string,
    meta: MemoryEntryMeta,
    value: unknown,
  ): void {
    if (!this.config.prefetchEnabled) return;

    const cacheKey = `${meta.layer}::${key}`;
    this.updatePrefetchCache(cacheKey, meta, value);
    this.incrementAccess(cacheKey);
  }

  private updatePrefetchCache(
    cacheKey: string,
    meta: MemoryEntryMeta,
    value: unknown,
  ): void {
    if (!this.config.prefetchEnabled) return;

    if (this.prefetchCache.size >= this.config.prefetchMaxEntries) {
      // Evict least accessed
      let minAccess = Infinity;
      let minKey: string | undefined;
      for (const [key, _] of this.prefetchCache) {
        const count = this.accessCounters.get(key) ?? 0;
        if (count < minAccess) {
          minAccess = count;
          minKey = key;
        }
      }
      if (minKey) {
        this.prefetchCache.delete(minKey);
      }
    }

    this.prefetchCache.set(cacheKey, { meta, value });
  }

  private incrementAccess(key: string): void {
    const current = this.accessCounters.get(key) ?? 0;
    this.accessCounters.set(key, current + 1);
  }

  private async warmCaches(): Promise<void> {
    try {
      const response = await this.layers.longTerm.query({
        layer: 'LONG_TERM',
        limit: this.config.prefetchMaxEntries,
        offset: 0,
      });

      for (const result of response.results) {
        const cacheKey = `LONG_TERM::${result.entry.id}`;
        this.updatePrefetchCache(cacheKey, result.entry, result.value);
      }
    } catch {
      // Cache warming is best-effort
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: Monitoring
  // ---------------------------------------------------------------------------

  private startMonitoring(): void {
    this.stopMonitoring();
    if (this.config.monitoringInterval > 0) {
      this.monitoringTimer = setInterval(() => {
        this.stats().catch(() => {});
      }, this.config.monitoringInterval);
    }
  }

  private stopMonitoring(): void {
    if (this.monitoringTimer !== null) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
  }

  private startConsolidation(): void {
    this.stopConsolidation();
    if (this.config.consolidationInterval > 0) {
      this.consolidationTimer = setInterval(() => {
        this.consolidateAll().catch(() => {});
      }, this.config.consolidationInterval);
    }
  }

  private stopConsolidation(): void {
    if (this.consolidationTimer !== null) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: Events
  // ---------------------------------------------------------------------------

  private emit(
    type: MemoryEvent['type'],
    layer: MemoryLayer,
    agentId?: AgentId | undefined,
    entryId?: string | undefined,
    details?: Record<string, unknown> | undefined,
  ): void {
    const event: MemoryEvent = {
      type,
      layer,
      agentId,
      entryId,
      timestamp: new Date().toISOString(),
      details,
    };

    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // Silently swallow handler errors
        }
      }
    }
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

/**
 * Consolidated memory usage report.
 */
export interface MemoryUsageReport {
  stats: MemoryStats;
  activeSessions: number;
  vectorCount: number;
  prefetchCacheSize: number;
  autoRouting: boolean;
  crossLayerSearch: boolean;
  consolidationInterval: Duration;
}

/**
 * Result of a cross-layer consolidation run.
 */
export interface MemoryManagerConsolidationResult {
  working: OptimizeResult;
  session: OptimizeResult;
  longTermConsolidation: import('./longterm.js').ConsolidationResult;
  optimization: OptimizeResult;
  semantic: OptimizeResult;
  vector: OptimizeResult;
  knowledgeGraph: OptimizeResult;
}
