import { v4 as uuidv4 } from 'uuid';
import type {
  MemoryLayer,
  AgentId,
  Duration,
  Bytes,
} from '@agent-preflight/types';
import type {
  MemoryEntryMeta,
  MemoryQuery,
  MemorySearchResult,
  MemorySearchResponse,
  MemoryStats,
  MemoryLayerConfig,
  MemoryEvent,
} from './types';

// =============================================================================
// MemoryStore Interface
// =============================================================================

/**
 * Core storage interface for the multi-layer memory system.
 *
 * Each method accepts an abort signal for cancellation support and returns
 * structured results with error handling. Implementations may be in-memory,
 * persisted to disk, or backed by an external database.
 */
export interface MemoryStore {
  /**
   * Save a value to memory under the given key and layer.
   * Creates a new entry or updates an existing one.
   */
  save(
    layer: MemoryLayer,
    key: string,
    value: unknown,
    options?: SaveOptions | undefined,
  ): Promise<MemoryEntryMeta>;

  /**
   * Retrieve a single entry by layer and key.
   * Returns null if the entry does not exist or has expired.
   */
  get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null>;

  /**
   * Query entries across layers using structured filters.
   */
  query(query: MemoryQuery): Promise<MemorySearchResponse>;

  /**
   * Delete a single entry by layer and key.
   * Returns true if an entry was actually removed.
   */
  delete(layer: MemoryLayer, key: string): Promise<boolean>;

  /**
   * Clear all entries for a given layer and agent.
   * Returns the number of entries removed.
   */
  clear(layer: MemoryLayer, agentId: AgentId): Promise<number>;

  /**
   * Remove all entries across all layers.
   */
  clearAll(): Promise<void>;

  /**
   * Return aggregate statistics for this store.
   */
  stats(): Promise<MemoryStats>;

  /**
   * Perform internal maintenance (expiration, eviction, optimization).
   */
  optimize(): Promise<OptimizeResult>;
}

/**
 * Options for saving an entry to memory.
 */
export interface SaveOptions {
  /** Override the default TTL for this specific entry (ms). */
  ttl?: Duration | null | undefined;
  /** Priority for eviction decisions (0-100). */
  priority?: number | undefined;
  /** Tags for categorisation and filtering. */
  tags?: string[] | undefined;
  /** Whether to encrypt this entry at rest. */
  encrypt?: boolean | undefined;
  /** Session identifier for session-scoped entries. */
  sessionId?: string | undefined;
  /** Embedding vector for semantic search support. */
  embedding?: number[] | undefined;
}

/**
 * Result of an optimize() run.
 */
export interface OptimizeResult {
  /** Number of expired entries evicted. */
  entriesExpired: number;
  /** Number of entries evicted due to size limits. */
  entriesEvicted: number;
  /** Total bytes reclaimed. */
  bytesReclaimed: Bytes;
  /** Duration the optimization took in ms. */
  duration: Duration;
}

// =============================================================================
// Internal Entry (stored in memory)
// =============================================================================

interface InternalEntry {
  meta: MemoryEntryMeta;
  value: unknown;
  /** LRU timestamp — updated on every access. */
  lastAccessed: number;
}

// =============================================================================
// Index Structures
// =============================================================================

/**
 * Lightweight inverted index for tag-based lookups.
 */
class TagIndex {
  private readonly index = new Map<string, Set<string>>();

  add(tag: string, entryId: string): void {
    let set = this.index.get(tag);
    if (!set) {
      set = new Set();
      this.index.set(tag, set);
    }
    set.add(entryId);
  }

  remove(tag: string, entryId: string): void {
    const set = this.index.get(tag);
    if (set) {
      set.delete(entryId);
      if (set.size === 0) {
        this.index.delete(tag);
      }
    }
  }

  removeEntry(entryId: string, tags: string[]): void {
    for (const tag of tags) {
      this.remove(tag, entryId);
    }
  }

  getEntryIds(tags: string[]): Set<string> {
    const result = new Set<string>();
    for (const tag of tags) {
      const set = this.index.get(tag);
      if (set) {
        for (const id of set) {
          result.add(id);
        }
      }
    }
    return result;
  }

  clear(): void {
    this.index.clear();
  }
}

// =============================================================================
// Default Layer Configuration
// =============================================================================

const DEFAULT_LAYER_CONFIGS: Record<MemoryLayer, MemoryLayerConfig> = {
  WORKING: {
    maxSize: 10 * 1024 * 1024, // 10 MB
    ttl: 300_000, // 5 minutes
    maxEntries: 1000,
    encryption: false,
    persistence: false,
  },
  SESSION: {
    maxSize: 50 * 1024 * 1024, // 50 MB
    ttl: 3_600_000, // 1 hour
    maxEntries: 10_000,
    encryption: false,
    persistence: false,
  },
  LONG_TERM: {
    maxSize: 500 * 1024 * 1024, // 500 MB
    ttl: null, // permanent
    maxEntries: 100_000,
    encryption: false,
    persistence: true,
  },
  SEMANTIC: {
    maxSize: 200 * 1024 * 1024, // 200 MB
    ttl: null,
    maxEntries: 50_000,
    encryption: false,
    persistence: true,
  },
  KNOWLEDGE_GRAPH: {
    maxSize: 1 * 1024 * 1024 * 1024, // 1 GB
    ttl: null,
    maxEntries: 1_000_000,
    encryption: false,
    persistence: true,
  },
  VECTOR: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2 GB
    ttl: null,
    maxEntries: 5_000_000,
    encryption: false,
    persistence: true,
  },
  PROJECT: {
    maxSize: 100 * 1024 * 1024,
    ttl: null,
    maxEntries: 20_000,
    encryption: false,
    persistence: true,
  },
  USER: {
    maxSize: 100 * 1024 * 1024,
    ttl: null,
    maxEntries: 20_000,
    encryption: true,
    persistence: true,
  },
  SHARED: {
    maxSize: 200 * 1024 * 1024,
    ttl: null,
    maxEntries: 50_000,
    encryption: false,
    persistence: true,
  },
  ENCRYPTED: {
    maxSize: 100 * 1024 * 1024,
    ttl: null,
    maxEntries: 20_000,
    encryption: true,
    persistence: true,
  },
};

// =============================================================================
// InMemoryMemoryStore
// =============================================================================

/**
 * Efficient in-memory implementation of the MemoryStore interface.
 *
 * Features:
 * - O(1) get/save by exact key
 * - TTL-based expiration (lazy on read + eager on optimize)
 * - Size-based eviction using LRU when maxSize or maxEntries is exceeded
 * - Tag-based inverted index for fast filtered queries
 * - Bulk save and delete operations
 * - Per-layer configurable limits and TTLs
 */
export class InMemoryMemoryStore implements MemoryStore {
  private readonly entries = new Map<string, InternalEntry>();
  private readonly tagIndex = new TagIndex();
  private readonly layerConfigs: Map<MemoryLayer, MemoryLayerConfig>;
  private currentSizes = new Map<MemoryLayer, number>();
  private stats_ = {
    hits: 0,
    misses: 0,
  };

  constructor(overrides?: Partial<Record<MemoryLayer, Partial<MemoryLayerConfig>>> | undefined) {
    const configs = { ...DEFAULT_LAYER_CONFIGS };
    if (overrides) {
      for (const [layer, partial] of Object.entries(overrides)) {
        const existing = configs[layer as MemoryLayer];
        if (existing) {
          configs[layer as MemoryLayer] = { ...existing, ...partial } as MemoryLayerConfig;
        }
      }
    }
    this.layerConfigs = new Map(
      Object.entries(configs) as [MemoryLayer, MemoryLayerConfig][],
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async save(
    layer: MemoryLayer,
    key: string,
    value: unknown,
    options?: SaveOptions | undefined,
  ): Promise<MemoryEntryMeta> {
    this.assertLayer(layer);
    const now = Date.now();
    const ttl = options?.ttl !== undefined ? options.ttl : this.getConfig(layer).ttl;
    const serialized = this.serialize(value);
    const checksum = await this.computeChecksum(serialized);
    const entryKey = this.entryKey(layer, key);

    const existing = this.entries.get(entryKey);
    const id = existing?.meta.id ?? uuidv4();

    const meta: MemoryEntryMeta = {
      id,
      layer,
      agentId: existing?.meta.agentId ?? 'unknown',
      sessionId: options?.sessionId ?? existing?.meta.sessionId,
      timestamp: new Date(now).toISOString(),
      ttl,
      priority: options?.priority ?? existing?.meta.priority ?? 50,
      tags: options?.tags ?? existing?.meta.tags ?? [],
      encrypted: options?.encrypt ?? existing?.meta.encrypted ?? false,
      size: new TextEncoder().encode(serialized).length,
      checksum,
    };

    this.evictExpired(layer);

    const newEntry: InternalEntry = {
      meta,
      value,
      lastAccessed: now,
    };

    // Track size delta for existing entries
    if (existing) {
      this.adjustSize(layer, -existing.meta.size);
      this.tagIndex.removeEntry(existing.meta.id, existing.meta.tags);
    }

    this.entries.set(entryKey, newEntry);
    this.adjustSize(layer, meta.size);

    for (const tag of meta.tags) {
      this.tagIndex.add(tag, id);
    }

    await this.evictBySize(layer);

    return meta;
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    const entryKey = this.entryKey(layer, key);
    const entry = this.entries.get(entryKey);
    if (!entry) {
      this.stats_.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.entries.delete(entryKey);
      this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
      this.adjustSize(layer, -entry.meta.size);
      this.stats_.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    this.stats_.hits++;
    return { meta: entry.meta, value: entry.value };
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    const start = performance.now();
    const candidates = this.collectCandidates(query);
    const ranked = this.rankResults(candidates, query);
    const total = ranked.length;

    // Paginate
    const offset = query.offset ?? 0;
    const limit = query.limit;
    const page = ranked.slice(offset, offset + limit);

    const duration = performance.now() - start;
    return { results: page, total, query, duration };
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    const entryKey = this.entryKey(layer, key);
    const entry = this.entries.get(entryKey);
    if (!entry) {
      return false;
    }

    this.entries.delete(entryKey);
    this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
    this.adjustSize(layer, -entry.meta.size);
    return true;
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    let count = 0;
    for (const [entryKey, entry] of this.entries) {
      if (entry.meta.layer === layer && entry.meta.agentId === agentId) {
        this.entries.delete(entryKey);
        this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
        this.adjustSize(layer, -entry.meta.size);
        count++;
      }
    }
    return count;
  }

  async clearAll(): Promise<void> {
    this.entries.clear();
    this.tagIndex.clear();
    this.currentSizes.clear();
    this.stats_ = { hits: 0, misses: 0 };
  }

  async stats(): Promise<MemoryStats> {
    const byLayer: MemoryStats['byLayer'] = {};
    let totalEntries = 0;
    let totalSize = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const entry of this.entries.values()) {
      totalEntries++;
      totalSize += entry.meta.size;

      let layerStats = byLayer[entry.meta.layer];
      if (!layerStats) {
        layerStats = { entries: 0, size: 0 };
        byLayer[entry.meta.layer] = layerStats;
      }
      layerStats.entries++;
      layerStats.size += entry.meta.size;

      const ts = new Date(entry.meta.timestamp).getTime();
      if (oldest === null || ts < oldest) oldest = ts;
      if (newest === null || ts > newest) newest = ts;
    }

    const total = this.stats_.hits + this.stats_.misses;
    const hitRate = total > 0 ? (this.stats_.hits / total) * 100 : 100;

    return {
      totalEntries,
      totalSize,
      byLayer,
      hitRate,
      hits: this.stats_.hits,
      misses: this.stats_.misses,
      oldestEntry: oldest ? new Date(oldest).toISOString() : null,
      newestEntry: newest ? new Date(newest).toISOString() : null,
    };
  }

  async optimize(): Promise<OptimizeResult> {
    const start = performance.now();
    let entriesExpired = 0;
    let entriesEvicted = 0;
    let bytesReclaimed = 0;

    // Phase 1: Evict expired entries
    for (const [entryKey, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(entryKey);
        this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
        this.adjustSize(entry.meta.layer, -entry.meta.size);
        bytesReclaimed += entry.meta.size;
        entriesExpired++;
      }
    }

    // Phase 2: Evict by size (LRU) for each layer
    for (const layer of this.layerConfigs.keys()) {
      const config = this.getConfig(layer);
      const currentSize = this.currentSizes.get(layer) ?? 0;
      const currentCount = this.countEntries(layer);

      if (currentSize > config.maxSize || currentCount > config.maxEntries) {
        const excess = Math.max(
          currentSize - config.maxSize,
          (currentCount - config.maxEntries) * 1024, // approximate
        );
        const evicted = this.evictLRU(layer, excess);
        entriesEvicted += evicted.entries;
        bytesReclaimed += evicted.bytes;
      }
    }

    const duration = performance.now() - start;
    return { entriesExpired, entriesEvicted, bytesReclaimed, duration };
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Save multiple entries in a single batch (more efficient than individual calls).
   */
  async saveMany(
    items: { layer: MemoryLayer; key: string; value: unknown; options?: SaveOptions | undefined }[],
  ): Promise<MemoryEntryMeta[]> {
    const results: MemoryEntryMeta[] = [];
    for (const item of items) {
      results.push(await this.save(item.layer, item.key, item.value, item.options));
    }
    return results;
  }

  /**
   * Delete multiple entries by layer and key.
   * Returns the count of actually deleted entries.
   */
  async deleteMany(keys: { layer: MemoryLayer; key: string }[]): Promise<number> {
    let count = 0;
    for (const { layer, key } of keys) {
      if (await this.delete(layer, key)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get the configuration for a specific layer.
   */
  getLayerConfig(layer: MemoryLayer): MemoryLayerConfig {
    return this.getConfig(layer);
  }

  /**
   * Update configuration for a specific layer at runtime.
   */
  setLayerConfig(layer: MemoryLayer, config: Partial<MemoryLayerConfig>): void {
    const existing = this.getConfig(layer);
    this.layerConfigs.set(layer, { ...existing, ...config });
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  private listeners = new Map<MemoryEvent['type'], Set<(event: MemoryEvent) => void>>();

  /**
   * Register a listener for memory events.
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
   * Remove a previously registered listener.
   */
  off(eventType: MemoryEvent['type'], handler: (event: MemoryEvent) => void): void {
    const set = this.listeners.get(eventType);
    if (set) {
      set.delete(handler);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private entryKey(layer: MemoryLayer, key: string): string {
    return `${layer}::${key}`;
  }

  private assertLayer(layer: MemoryLayer): void {
    if (!this.layerConfigs.has(layer)) {
      throw new Error(`Unknown memory layer: ${layer}`);
    }
  }

  private getConfig(layer: MemoryLayer): MemoryLayerConfig {
    const config = this.layerConfigs.get(layer);
    if (!config) {
      throw new Error(`No configuration found for layer: ${layer}`);
    }
    return config;
  }

  private isExpired(entry: InternalEntry): boolean {
    if (entry.meta.ttl === null) {
      return false;
    }
    const createdAt = new Date(entry.meta.timestamp).getTime();
    return Date.now() > createdAt + entry.meta.ttl;
  }

  private adjustSize(layer: MemoryLayer, delta: number): void {
    const current = this.currentSizes.get(layer) ?? 0;
    this.currentSizes.set(layer, Math.max(0, current + delta));
  }

  private countEntries(layer: MemoryLayer): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.meta.layer === layer) {
        count++;
      }
    }
    return count;
  }

  private evictExpired(layer: MemoryLayer): void {
    for (const [entryKey, entry] of this.entries) {
      if (entry.meta.layer === layer && this.isExpired(entry)) {
        this.entries.delete(entryKey);
        this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
        this.adjustSize(layer, -entry.meta.size);
      }
    }
  }

  private evictBySize(layer: MemoryLayer): void {
    const config = this.getConfig(layer);
    const currentSize = this.currentSizes.get(layer) ?? 0;
    const currentCount = this.countEntries(layer);

    if (currentSize <= config.maxSize && currentCount <= config.maxEntries) {
      return;
    }

    const excess = Math.max(currentSize - config.maxSize, 0);
    if (excess > 0) {
      this.evictLRU(layer, excess);
    }
  }

  private evictLRU(layer: MemoryLayer, targetBytes: Bytes): { entries: number; bytes: number } {
    const candidates: { key: string; lastAccessed: number; size: number }[] = [];

    for (const [entryKey, entry] of this.entries) {
      if (entry.meta.layer === layer) {
        candidates.push({
          key: entryKey,
          lastAccessed: entry.lastAccessed,
          size: entry.meta.size,
        });
      }
    }

    candidates.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let evictedBytes = 0;
    let evictedCount = 0;

    for (const candidate of candidates) {
      if (evictedBytes >= targetBytes) break;
      const entry = this.entries.get(candidate.key);
      if (entry) {
        this.entries.delete(candidate.key);
        this.tagIndex.removeEntry(entry.meta.id, entry.meta.tags);
        this.adjustSize(layer, -entry.meta.size);
        evictedBytes += entry.meta.size;
        evictedCount++;
      }
    }

    return { entries: evictedCount, bytes: evictedBytes };
  }

  private collectCandidates(query: MemoryQuery): InternalEntry[] {
    const candidates: InternalEntry[] = [];

    for (const entry of this.entries.values()) {
      // Filter by layer
      if (query.layer && entry.meta.layer !== query.layer) continue;

      // Filter by agent
      if (query.agentId && entry.meta.agentId !== query.agentId) continue;

      // Filter by session
      if (query.sessionId && entry.meta.sessionId !== query.sessionId) continue;

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        const hasTag = query.tags.some((t) => entry.meta.tags.includes(t));
        if (!hasTag) continue;
      }

      // Filter by time range
      if (query.timeRange) {
        const ts = new Date(entry.meta.timestamp).getTime();
        if (query.timeRange.start && ts < new Date(query.timeRange.start).getTime()) continue;
        if (query.timeRange.end && ts > new Date(query.timeRange.end).getTime()) continue;
      }

      // Skip expired
      if (this.isExpired(entry)) continue;

      candidates.push(entry);
    }

    return candidates;
  }

  private rankResults(
    candidates: InternalEntry[],
    query: MemoryQuery,
  ): MemorySearchResult[] {
    const hasTextQuery = query.query !== undefined && query.query.length > 0;
    const queryText = (query.query ?? '').toLowerCase();

    const scored = candidates.map((entry) => {
      let score = 0;

      // Text match scoring
      if (hasTextQuery) {
        const serialized = this.serialize(entry.value).toLowerCase();
        if (serialized.includes(queryText)) {
          score += 0.8;
          // Boost for exact key match
          if (entry.meta.id.includes(queryText)) {
            score += 0.2;
          }
        } else {
          // No text match at all → low relevance
          score += 0.1;
        }
      } else {
        // No query string → return everything with a base score
        score = 0.5;
      }

      // Priority boost
      score += (entry.meta.priority / 100) * 0.2;

      // Recency boost (entries accessed within last minute get +0.1)
      const age = Date.now() - entry.lastAccessed;
      if (age < 60_000) {
        score += 0.1;
      } else if (age < 300_000) {
        score += 0.05;
      }

      return {
        entry: entry.meta,
        value: entry.value,
        score: Math.min(1, score),
      };
    });

    // Apply relevance threshold
    const threshold = query.relevance ?? 0;
    const filtered = scored.filter((r) => r.score >= threshold);

    // Sort by score descending, then by recency
    filtered.sort((a, b) => {
      const diff = b.score - a.score;
      if (diff !== 0) return diff;
      return new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime();
    });

    return filtered;
  }

  private serialize(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private async computeChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
