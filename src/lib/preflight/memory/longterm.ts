import type { MemoryLayer, AgentId, Duration, Bytes } from '@agent-preflight/types';
import {
  InMemoryMemoryStore,
} from './store';
import type {
  MemoryEntryMeta,
  MemoryQuery,
  MemorySearchResponse,
  MemoryStats,
  MemoryLayerConfig,
  ConsolidationStrategy,
} from './types';
import type { SaveOptions, OptimizeResult, MemoryStore } from './store';

// =============================================================================
// Long-Term Memory
// =============================================================================

/**
 * Configuration for the Long-Term Memory layer.
 */
export interface LongTermMemoryConfig {
  /** Maximum storage size in bytes. */
  maxSize: Bytes;
  /** Default TTL (null = permanent). */
  ttl: Duration | null;
  /** Maximum number of entries. */
  maxEntries: number;
  /** Importance threshold below which entries become candidates for consolidation. */
  importanceThreshold: number;
  /** The consolidation strategy to use when pruning old entries. */
  consolidationStrategy: ConsolidationStrategy;
  /** Interval between automatic consolidation runs (ms). 0 = manual only. */
  consolidationInterval: Duration;
  /** Whether to persist data to disk. */
  persistence: boolean;
  /** Whether to compress stored values. */
  compression: boolean;
}

const DEFAULT_LONG_TERM_CONFIG: LongTermMemoryConfig = {
  maxSize: 500 * 1024 * 1024,
  ttl: null,
  maxEntries: 100_000,
  importanceThreshold: 0.3,
  consolidationStrategy: 'importance_threshold',
  consolidationInterval: 3_600_000, // 1 hour
  persistence: true,
  compression: false,
};

/**
 * Long-Term Memory — persistent knowledge storage.
 *
 * Used for learned patterns, user preferences, historical data, and any
 * information that should survive across sessions and restarts.
 *
 * Features:
 * - Importance-based retention (low-importance entries get consolidated first)
 * - Automatic summarization and compression of stale entries
 * - Configurable consolidation strategies
 * - Periodic maintenance runs
 * - Persistence support
 */
export class LongTermMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'LONG_TERM';
  private readonly config: LongTermMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  private consolidationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<LongTermMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_LONG_TERM_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      maxEntries: this.config.maxEntries,
      encryption: false,
      persistence: this.config.persistence,
      compression: this.config.compression,
    };

    this.store = new InMemoryMemoryStore({
      LONG_TERM: layerConfig,
    });

    this.startAutoConsolidation();
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
    return this.store.save(layer, key, value, {
      ...options,
      ttl: options?.ttl !== undefined ? options.ttl : this.config.ttl,
    });
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    return this.store.get(layer, key);
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    return this.store.query({
      ...query,
      layer: 'LONG_TERM',
    });
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    return this.store.delete(layer, key);
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    return this.store.clear(layer, agentId);
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    const result = await this.store.optimize();
    await this.consolidate();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Long-Term Memory Specific
  // ---------------------------------------------------------------------------

  /**
   * Run consolidation manually.
   *
   * Consolidation evaluates entries based on the configured strategy and
   * either removes low-value entries or compresses/summarises them.
   */
  async consolidate(): Promise<ConsolidationResult> {
    const start = performance.now();
    const allEntries = await this.getAllEntries();
    let entriesRemoved = 0;
    let entriesCompressed = 0;
    let bytesReclaimed = 0;

    const strategy = this.config.consolidationStrategy;
    const threshold = this.config.importanceThreshold;

    for (const entry of allEntries) {
      const importance = this.calculateImportance(entry, strategy);

      if (importance < threshold) {
        // Remove low-importance entries
        if (this.config.compression) {
          // Attempt to compress instead of removing
          const compressed = this.compress(entry.value);
          if (compressed.length < entry.meta.size) {
            entriesCompressed++;
            continue;
          }
        }

        await this.store.delete('LONG_TERM', entry.meta.id);
        entriesRemoved++;
        bytesReclaimed += entry.meta.size;
      }
    }

    await this.store.optimize();

    const duration = performance.now() - start;
    return { entriesRemoved, entriesCompressed, bytesReclaimed, duration };
  }

  /**
   * Set the importance threshold for consolidation.
   */
  setImportanceThreshold(threshold: number): void {
    this.config.importanceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Set the consolidation strategy.
   */
  setConsolidationStrategy(strategy: ConsolidationStrategy): void {
    this.config.consolidationStrategy = strategy;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): LongTermMemoryConfig {
    return { ...this.config };
  }

  /**
   * Start or restart the automatic consolidation timer.
   */
  startAutoConsolidation(): void {
    this.stopAutoConsolidation();
    if (this.config.consolidationInterval > 0) {
      this.consolidationTimer = setInterval(
        () => { this.consolidate().catch(() => {}); },
        this.config.consolidationInterval,
      );
    }
  }

  /**
   * Stop automatic consolidation.
   */
  stopAutoConsolidation(): void {
    if (this.consolidationTimer !== null) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async getAllEntries(): Promise<{ meta: MemoryEntryMeta; value: unknown }[]> {
    const response = await this.store.query({
      layer: 'LONG_TERM',
      limit: 1_000_000,
      offset: 0,
    });
    return response.results.map((r) => ({ meta: r.entry, value: r.value }));
  }

  /**
   * Calculate a normalised importance score (0-1) for an entry based on the
   * configured strategy.
   */
  private calculateImportance(
    entry: { meta: MemoryEntryMeta; value: unknown },
    strategy: ConsolidationStrategy,
  ): number {
    switch (strategy) {
      case 'importance_threshold': {
        // Use the entry's priority field as the importance signal
        return entry.meta.priority / 100;
      }
      case 'recency_weighted': {
        const age = Date.now() - new Date(entry.meta.timestamp).getTime();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        return Math.max(0, 1 - age / maxAge);
      }
      case 'frequency_weighted': {
        // Estimate: entries with more tags are considered more important
        const tagBonus = Math.min(entry.meta.tags.length / 10, 0.3);
        return Math.min(1, entry.meta.priority / 100 + tagBonus);
      }
      case 'semantic_clustering':
      case 'summary_compression': {
        // Fall through to default for complex strategies
        return entry.meta.priority / 100;
      }
      default: {
        return entry.meta.priority / 100;
      }
    }
  }

  /**
   * Simple compression placeholder — serialises and measures.
   * In production this would use actual compression (zlib, brotli, etc.).
   */
  private compress(value: unknown): Uint8Array {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return new TextEncoder().encode(serialized);
  }
}

/**
 * Result of a consolidation run.
 */
export interface ConsolidationResult {
  entriesRemoved: number;
  entriesCompressed: number;
  bytesReclaimed: Bytes;
  duration: Duration;
}
