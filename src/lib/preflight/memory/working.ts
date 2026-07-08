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
} from './types';
import type { SaveOptions, OptimizeResult, MemoryStore } from './store';

// =============================================================================
// Working Memory
// =============================================================================

/**
 * Configuration specific to the Working Memory layer.
 */
export interface WorkingMemoryConfig {
  /** Maximum size in bytes. */
  maxSize: Bytes;
  /** Default TTL for entries (very short — session-based). */
  ttl: Duration;
  /** Maximum number of entries. */
  maxEntries: number;
  /** Size of the context window (how many recent items to keep hot). */
  contextWindowSize: number;
}

const DEFAULT_WORKING_MEMORY_CONFIG: WorkingMemoryConfig = {
  maxSize: 10 * 1024 * 1024,
  ttl: 300_000, // 5 minutes
  maxEntries: 1000,
  contextWindowSize: 50,
};

/**
 * Working Memory — the shortest-lived memory layer.
 *
 * Used for active task context, immediate reasoning state, and ephemeral
 * data that only needs to survive the current task or interaction.
 *
 * Features:
 * - Very short TTL (typically minutes)
 * - Context window management — prioritises the N most recent entries
 * - Automatic size-based eviction (LRU)
 * - Recent items boosted in query results
 */
export class WorkingMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'WORKING';
  private readonly config: WorkingMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  private contextWindow: string[] = [];

  constructor(config?: Partial<WorkingMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_WORKING_MEMORY_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      maxEntries: this.config.maxEntries,
      encryption: false,
      persistence: false,
    };

    this.store = new InMemoryMemoryStore({
      WORKING: layerConfig,
    });
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
    const meta = await this.store.save(layer, key, value, {
      ...options,
      ttl: options?.ttl ?? this.config.ttl,
    });

    // Update context window
    this.addToContextWindow(meta.id);

    return meta;
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    return this.store.get(layer, key);
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    const response = await this.store.query({
      ...query,
      layer: 'WORKING',
    });

    // Boost context window entries in results
    const boosted = response.results.map((r) => {
      const inWindow = this.contextWindow.includes(r.entry.id);
      return {
        ...r,
        score: inWindow ? Math.min(1, r.score + 0.15) : r.score,
      };
    });

    boosted.sort((a, b) => b.score - a.score);

    return {
      ...response,
      results: boosted.slice(0, query.limit),
    };
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    return this.store.delete(layer, key);
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    const count = await this.store.clear(layer, agentId);
    this.contextWindow = [];
    return count;
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
    this.contextWindow = [];
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    const result = await this.store.optimize();
    // Trim context window after optimization
    this.trimContextWindow();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Working Memory Specific
  // ---------------------------------------------------------------------------

  /**
   * Get the current context window entries (most recent N items).
   */
  async getContextWindow(agentId?: AgentId | undefined): Promise<{ meta: MemoryEntryMeta; value: unknown }[]> {
    const result: { meta: MemoryEntryMeta; value: unknown }[] = [];

    for (const id of this.contextWindow) {
      const entry = await this.get('WORKING', id);
      if (entry && (!agentId || entry.meta.agentId === agentId)) {
        result.push(entry);
      }
    }

    return result;
  }

  /**
   * Get the current context window size limit.
   */
  getContextWindowSize(): number {
    return this.config.contextWindowSize;
  }

  /**
   * Resize the context window, trimming oldest entries if necessary.
   */
  setContextWindowSize(size: number): void {
    this.config.contextWindowSize = size;
    this.trimContextWindow();
  }

  /**
   * Set the working memory TTL dynamically.
   */
  setTTL(ttl: Duration): void {
    this.config.ttl = ttl;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): WorkingMemoryConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private addToContextWindow(entryId: string): void {
    // Remove duplicate if present
    const idx = this.contextWindow.indexOf(entryId);
    if (idx !== -1) {
      this.contextWindow.splice(idx, 1);
    }

    // Add to front (most recent)
    this.contextWindow.unshift(entryId);

    // Trim to max size
    this.trimContextWindow();
  }

  private trimContextWindow(): void {
    if (this.contextWindow.length > this.config.contextWindowSize) {
      this.contextWindow = this.contextWindow.slice(0, this.config.contextWindowSize);
    }
  }
}
