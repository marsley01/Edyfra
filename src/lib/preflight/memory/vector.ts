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
  VectorIndexConfig,
  VectorEntry,
  VectorSearchResult,
} from './types';
import type { SaveOptions, OptimizeResult, MemoryStore } from './store';

// =============================================================================
// Vector Memory
// =============================================================================

/**
 * Configuration for the Vector Memory layer.
 */
export interface VectorMemoryConfig {
  /** Maximum storage size in bytes. */
  maxSize: Bytes;
  /** Maximum number of vectors. */
  maxEntries: number;
  /** Dimensionality of vectors. */
  dimension: number;
  /** Similarity metric. */
  metric: 'cosine' | 'euclidean' | 'dotProduct';
  /** Number of clusters for IVF index (0 = brute force). */
  nClusters: number;
  /** Number of clusters to probe during search. */
  nProbes: number;
  /** Whether to normalize vectors. */
  normalize: boolean;
  /** Whether to persist data. */
  persistence: boolean;
  /** Interval between index optimization runs (ms). */
  optimizeInterval: Duration;
}

const DEFAULT_VECTOR_CONFIG: VectorMemoryConfig = {
  maxSize: 2 * 1024 * 1024 * 1024,
  maxEntries: 5_000_000,
  dimension: 384,
  metric: 'cosine',
  nClusters: 100,
  nProbes: 10,
  normalize: true,
  persistence: true,
  optimizeInterval: 3_600_000, // 1 hour
};

/**
 * Abstraction for embedding providers.
 */
export interface EmbeddingProvider {
  /**
   * Generate an embedding vector for the given input.
   */
  embed(input: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple inputs in batch.
   */
  embedBatch(inputs: string[]): Promise<number[][]>;

  /**
   * The dimensionality of the generated embeddings.
   */
  readonly dimension: number;
}

/**
 * Vector Memory — high-dimensional vector storage with ANN search.
 *
 * Used for efficient similarity search at scale, powering semantic lookup,
 * recommendation systems, and pattern matching across large datasets.
 *
 * Features:
 * - Approximate nearest neighbour (ANN) search using IVF index
 * - Configurable similarity metrics (cosine, euclidean, dot product)
 * - Embedding provider abstraction for pluggable models
 * - Automatic index optimisation
 * - Normalisation support
 */
export class VectorMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'VECTOR';
  private readonly config: VectorMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  private readonly vectors = new Map<string, number[]>();
  private readonly metadata = new Map<string, Record<string, unknown>>();
  private index: IVFIndex | null = null;
  private embeddingProvider: EmbeddingProvider | null = null;
  private optimizeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<VectorMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_VECTOR_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: null,
      maxEntries: this.config.maxEntries,
      encryption: false,
      persistence: this.config.persistence,
    };

    this.store = new InMemoryMemoryStore({
      VECTOR: layerConfig,
    });

    this.startAutoOptimize();
  }

  // ---------------------------------------------------------------------------
  // Embedding Provider
  // ---------------------------------------------------------------------------

  /**
   * Register an embedding provider for automatic embedding generation.
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Get the registered embedding provider.
   */
  getEmbeddingProvider(): EmbeddingProvider | null {
    return this.embeddingProvider;
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
    const meta = await this.store.save(layer, key, value, options);

    // Store vector if embedding was provided or can be generated
    if (options?.embedding && options.embedding.length > 0) {
      await this.storeVector(meta.id, options.embedding);
    } else if (this.embeddingProvider && typeof value === 'string') {
      const embedding = await this.embeddingProvider.embed(value);
      await this.storeVector(meta.id, embedding);
    }

    return meta;
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    return this.store.get(layer, key);
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    // If query provides an embedding, use vector search
    if (query.embedding && query.embedding.length > 0) {
      const vectorResults = await this.search(
        query.embedding,
        query.limit,
        query.relevance,
      );

      // Enrich with full entry data
      const enriched = await this.enrichResults(vectorResults);
      return {
        results: enriched,
        total: enriched.length,
        query,
        duration: 0,
      };
    }

    return this.store.query({ ...query, layer: 'VECTOR' });
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    const entry = await this.store.get(layer, key);
    if (entry) {
      this.vectors.delete(entry.meta.id);
      this.metadata.delete(entry.meta.id);
      this.index = null; // Mark index as stale
    }
    return this.store.delete(layer, key);
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    const count = await this.store.clear(layer, agentId);
    this.vectors.clear();
    this.metadata.clear();
    this.index = null;
    return count;
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
    this.vectors.clear();
    this.metadata.clear();
    this.index = null;
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    const result = await this.store.optimize();
    await this.rebuildIndex();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Vector Operations
  // ---------------------------------------------------------------------------

  /**
   * Store a vector entry directly.
   */
  async storeVector(id: string, vector: number[]): Promise<void> {
    const normalized = this.config.normalize ? this.normalize(vector) : vector;
    this.vectors.set(id, normalized);
    this.index = null; // Invalidate index
  }

  /**
   * Store a vector with associated metadata.
   */
  async storeVectorWithMetadata(
    id: string,
    vector: number[],
    meta: Record<string, unknown>,
  ): Promise<void> {
    const normalized = this.config.normalize ? this.normalize(vector) : vector;
    this.vectors.set(id, normalized);
    this.metadata.set(id, meta);
    this.index = null;
  }

  /**
   * Perform ANN search for vectors similar to the query vector.
   */
  async search(
    queryVector: number[],
    limit: number = 10,
    minScore?: number | undefined,
  ): Promise<VectorSearchResult[]> {
    const normalized = this.config.normalize ? this.normalize(queryVector) : queryVector;

    if (this.vectors.size === 0) return [];

    // Build index if stale
    if (!this.index) {
      await this.rebuildIndex();
    }

    const results = this.index
      ? this.index.search(normalized, limit)
      : this.bruteForceSearch(normalized, limit);

    const threshold = minScore ?? 0;
    return results
      .filter((r) => r.score >= threshold)
      .slice(0, limit);
  }

  /**
   * Count vectors currently stored.
   */
  vectorCount(): number {
    return this.vectors.size;
  }

  /**
   * Get the vector index configuration.
   */
  getIndexConfig(): VectorIndexConfig {
    return {
      dimension: this.config.dimension,
      metric: this.config.metric,
      nClusters: this.config.nClusters,
      nProbes: this.config.nProbes,
      normalize: this.config.normalize,
    };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): VectorMemoryConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Index Management
  // ---------------------------------------------------------------------------

  /**
   * Rebuild the IVF index from stored vectors.
   */
  async rebuildIndex(): Promise<void> {
    if (this.vectors.size === 0) {
      this.index = null;
      return;
    }

    const entries: VectorEntry[] = [];
    for (const [id, vector] of this.vectors) {
      entries.push({
        id,
        vector,
        metadata: this.metadata.get(id),
      });
    }

    this.index = new IVFIndex(entries, {
      dimension: this.config.dimension,
      metric: this.config.metric,
      nClusters: Math.min(this.config.nClusters, this.vectors.size),
      nProbes: this.config.nProbes,
      normalize: this.config.normalize,
    });

    await this.index.build();
  }

  /**
   * Start automatic index optimisation.
   */
  startAutoOptimize(): void {
    this.stopAutoOptimize();
    if (this.config.optimizeInterval > 0) {
      this.optimizeTimer = setInterval(
        () => { this.rebuildIndex().catch(() => {}); },
        this.config.optimizeInterval,
      );
    }
  }

  /**
   * Stop automatic index optimisation.
   */
  stopAutoOptimize(): void {
    if (this.optimizeTimer !== null) {
      clearInterval(this.optimizeTimer);
      this.optimizeTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }

  private computeSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    switch (this.config.metric) {
      case 'cosine': {
        const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
        // For normalized vectors, cosine = dot product
        return dot;
      }
      case 'euclidean': {
        const dist = Math.sqrt(
          a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0),
        );
        return 1 / (1 + dist);
      }
      case 'dotProduct': {
        return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
      }
      default: {
        return 0;
      }
    }
  }

  private bruteForceSearch(
    queryVector: number[],
    limit: number,
  ): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const [id, vector] of this.vectors) {
      const score = this.computeSimilarity(queryVector, vector);
      results.push({
        id,
        score,
        vector,
        metadata: this.metadata.get(id),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private async enrichResults(
    vectorResults: VectorSearchResult[],
  ): Promise<{ entry: MemoryEntryMeta; value: unknown; score: number }[]> {
    const enriched: { entry: MemoryEntryMeta; value: unknown; score: number }[] = [];

    for (const vr of vectorResults) {
      // Query the store to get full entry data
      const response = await this.store.query({
        layer: 'VECTOR',
        limit: 1,
        offset: 0,
        filters: { id: vr.id },
      });

      if (response.results.length > 0) {
        enriched.push({
          entry: response.results[0]!.entry,
          value: response.results[0]!.value,
          score: vr.score,
        });
      }
    }

    return enriched;
  }
}

// =============================================================================
// IVF Index (Inverted File Index)
// =============================================================================

/**
 * Simple IVF (Inverted File) index for approximate nearest neighbour search.
 *
 * Clusters vectors into K centroids at build time, then at search time only
 * probes the nearest N clusters (nProbes) for candidate results.
 */
class IVFIndex {
  private readonly config: VectorIndexConfig;
  private readonly entries: VectorEntry[];
  private centroids: number[][] = [];
  private invertedLists: Map<number, VectorEntry[]> = new Map();
  private built = false;

  constructor(entries: VectorEntry[], config: VectorIndexConfig) {
    this.entries = entries;
    this.config = config;
  }

  /**
   * Build the IVF index: cluster vectors and populate inverted lists.
   */
  async build(): Promise<void> {
    const k = this.config.nClusters ?? Math.min(100, this.entries.length);
    this.centroids = this.kmeansPlusPlus(this.entries, k);
    this.invertedLists.clear();

    for (const entry of this.entries) {
      const nearestCentroid = this.findNearestCentroid(entry.vector);
      let list = this.invertedLists.get(nearestCentroid);
      if (!list) {
        list = [];
        this.invertedLists.set(nearestCentroid, list);
      }
      list.push(entry);
    }

    this.built = true;
  }

  /**
   * Search for the nearest neighbours to the query vector.
   */
  search(queryVector: number[], limit: number): VectorSearchResult[] {
    if (!this.built) return [];

    const nProbes = this.config.nProbes ?? 10;
    const candidates: { centroidIdx: number; distance: number }[] = [];

    for (let i = 0; i < this.centroids.length; i++) {
      const centroid = this.centroids[i];
      if (!centroid) continue;
      const distance = this.euclideanDistance(queryVector, centroid);
      candidates.push({ centroidIdx: i, distance });
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const probedCentroids = candidates.slice(0, nProbes);

    const seen = new Set<string>();
    const results: VectorSearchResult[] = [];

    for (const { centroidIdx } of probedCentroids) {
      const list = this.invertedLists.get(centroidIdx);
      if (!list) continue;

      for (const entry of list) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);

        const score = this.computeSimilarity(queryVector, entry.vector);
        results.push({
          id: entry.id,
          score,
          vector: entry.vector,
          metadata: entry.metadata,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  private kmeansPlusPlus(entries: VectorEntry[], k: number): number[][] {
    if (entries.length === 0) return [];
    const kActual = Math.min(k, entries.length);

    // Choose first centroid randomly
    const centroids: number[][] = [
      [...(entries[Math.floor(Math.random() * entries.length)]?.vector ?? [])],
    ];

    while (centroids.length < kActual) {
      const distances = entries.map((entry) => {
        const minDist = Math.min(
          ...centroids.map((c) => this.euclideanDistance(entry.vector, c)),
        );
        return minDist * minDist;
      });
      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let threshold = Math.random() * totalDist;
      let chosenIdx = 0;
      for (let i = 0; i < distances.length; i++) {
        threshold -= distances[i] ?? 0;
        if (threshold <= 0) {
          chosenIdx = i;
          break;
        }
      }
      centroids.push([...(entries[chosenIdx]?.vector ?? [])]);
    }

    // Run a few k-means iterations
    const maxIterations = 10;
    for (let iter = 0; iter < maxIterations; iter++) {
      const assignments = new Map<number, number[][]>();

      for (const entry of entries) {
        const nearest = this.findNearestCentroidIndex(entry.vector, centroids);
        let group = assignments.get(nearest);
        if (!group) {
          group = [];
          assignments.set(nearest, group);
        }
        group.push(entry.vector);
      }

      let changed = false;
      for (let i = 0; i < centroids.length; i++) {
        const group = assignments.get(i);
        if (!group || group.length === 0) continue;

        const newCentroid = this.computeMean(group);
        const oldCentroid = centroids[i]!;
        if (this.euclideanDistance(newCentroid, oldCentroid) > 0.001) {
          centroids[i] = newCentroid;
          changed = true;
        }
      }

      if (!changed) break;
    }

    return centroids;
  }

  private findNearestCentroid(vector: number[]): number {
    return this.findNearestCentroidIndex(vector, this.centroids);
  }

  private findNearestCentroidIndex(
    vector: number[],
    centroids: number[][],
  ): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < centroids.length; i++) {
      const centroid = centroids[i];
      if (!centroid) continue;
      const dist = this.euclideanDistance(vector, centroid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0),
    );
  }

  private computeSimilarity(a: number[], b: number[]): number {
    switch (this.config.metric) {
      case 'cosine':
      case 'dotProduct': {
        return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
      }
      case 'euclidean': {
        const dist = this.euclideanDistance(a, b);
        return 1 / (1 + dist);
      }
      default: {
        return 0;
      }
    }
  }

  private computeMean(vectors: number[][]): number[] {
    const dim = vectors[0]?.length ?? 0;
    const mean = new Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i]! += vec[i] ?? 0;
      }
    }

    return mean.map((val) => val / vectors.length);
  }
}
