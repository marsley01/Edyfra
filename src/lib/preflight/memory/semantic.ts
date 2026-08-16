import type { MemoryLayer, AgentId, Bytes } from '@agent-preflight/types';
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
// Semantic Memory
// =============================================================================

/**
 * Configuration for the Semantic Memory layer.
 */
export interface SemanticMemoryConfig {
  /** Maximum storage size in bytes. */
  maxSize: Bytes;
  /** Maximum number of entries. */
  maxEntries: number;
  /** Dimensionality of the embedding vectors. */
  embeddingDimension: number;
  /** Similarity metric for semantic comparisons. */
  similarityMetric: 'cosine' | 'euclidean' | 'dotProduct';
  /** Minimum similarity threshold for query results. */
  minSimilarity: number;
  /** Whether to persist data. */
  persistence: boolean;
}

const DEFAULT_SEMANTIC_CONFIG: SemanticMemoryConfig = {
  maxSize: 200 * 1024 * 1024,
  maxEntries: 50_000,
  embeddingDimension: 384,
  similarityMetric: 'cosine',
  minSimilarity: 0.6,
  persistence: true,
};

/**
 * A concept cluster — a group of semantically related entries.
 */
export interface ConceptCluster {
  /** Unique cluster identifier. */
  id: string;
  /** Human-readable label for the cluster. */
  label: string;
  /** Entry IDs belonging to this cluster. */
  entryIds: string[];
  /** Centroid vector of the cluster. */
  centroid: number[];
  /** Number of entries in the cluster. */
  size: number;
}

/**
 * A relationship between two semantic entries.
 */
export interface SemanticRelationship {
  sourceId: string;
  targetId: string;
  type: 'similar' | 'related' | 'parent' | 'child' | 'contrast';
  strength: number;
}

/**
 * Semantic Memory — meaning-based retrieval layer.
 *
 * Uses embedding vectors to enable semantic similarity search, concept
 * clustering, and relationship mapping between stored entries.
 *
 * Features:
 * - Embedding-based storage and retrieval
 * - Semantic similarity search with configurable metrics
 * - Concept clustering via centroid-based grouping
 * - Relationship mapping between entries
 * - Configurable embedding dimension and similarity thresholds
 */
export class SemanticMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'SEMANTIC';
  private readonly config: SemanticMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  private readonly vectors = new Map<string, number[]>();
  private readonly clusters = new Map<string, ConceptCluster>();
  private readonly relationships: SemanticRelationship[] = [];

  constructor(config?: Partial<SemanticMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_SEMANTIC_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: null,
      maxEntries: this.config.maxEntries,
      encryption: false,
      persistence: this.config.persistence,
    };

    this.store = new InMemoryMemoryStore({
      SEMANTIC: layerConfig,
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
    const meta = await this.store.save(layer, key, value, options);

    // Store embedding vector if provided
    if (options?.embedding && options.embedding.length > 0) {
      this.vectors.set(meta.id, options.embedding);
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
    const baseResponse = await this.store.query({
      ...query,
      layer: 'SEMANTIC',
    });

    // If an embedding was provided, re-rank by semantic similarity
    if (query.embedding && query.embedding.length > 0) {
      const ranked = this.rerankBySemanticSimilarity(baseResponse.results, query.embedding);
      return { ...baseResponse, results: ranked.slice(0, query.limit) };
    }

    return baseResponse;
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    const entry = await this.store.get(layer, key);
    if (entry) {
      this.vectors.delete(entry.meta.id);
      this.removeFromClusters(entry.meta.id);
      this.removeRelationships(entry.meta.id);
    }
    return this.store.delete(layer, key);
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    const count = await this.store.clear(layer, agentId);
    this.vectors.clear();
    this.clusters.clear();
    this.relationships.length = 0;
    return count;
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
    this.vectors.clear();
    this.clusters.clear();
    this.relationships.length = 0;
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    const result = await this.store.optimize();
    await this.rebuildClusters();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Semantic Memory Specific
  // ---------------------------------------------------------------------------

  /**
   * Store an entry with its embedding vector.
   */
  async saveWithEmbedding(
    key: string,
    value: unknown,
    embedding: number[],
    options?: Omit<SaveOptions, 'embedding'> | undefined,
  ): Promise<MemoryEntryMeta> {
    return this.save('SEMANTIC', key, value, { ...options, embedding });
  }

  /**
   * Find entries semantically similar to the given embedding.
   */
  async findSimilar(
    embedding: number[],
    limit: number = 10,
    minScore?: number | undefined,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown; score: number }[]> {
    const entries: { meta: MemoryEntryMeta; value: unknown; score: number }[] = [];
    const threshold = minScore ?? this.config.minSimilarity;

    for (const [id, vec] of this.vectors) {
      const score = this.computeSimilarity(embedding, vec);
      if (score >= threshold) {
        // We need to look up the entry. Use the store's internal query.
        const response = await this.store.query({
          layer: 'SEMANTIC',
          limit: 1000,
          offset: 0,
          filters: { id },
        });
        for (const r of response.results) {
          if (r.entry.id === id) {
            entries.push({ meta: r.entry, value: r.value, score });
          }
        }
      }
    }

    entries.sort((a, b) => b.score - a.score);
    return entries.slice(0, limit);
  }

  /**
   * Build or rebuild concept clusters from the current vector store.
   */
  async rebuildClusters(): Promise<ConceptCluster[]> {
    this.clusters.clear();

    if (this.vectors.size === 0) return [];

    const vectors = Array.from(this.vectors.entries());
    const k = Math.min(10, vectors.length);

    // Simple k-means clustering (single pass for efficiency)
    const centroids = this.initializeCentroids(vectors, k);
    const assignments = new Map<string, number>();

    for (const [id, vec] of vectors) {
      let bestDist = Infinity;
      let bestCluster = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = this.computeDistance(vec, centroids[i]!);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = i;
        }
      }

      assignments.set(id, bestCluster);
    }

    // Build cluster objects
    const clusterEntries = new Map<number, string[]>();
    for (const [id, clusterIdx] of assignments) {
      let list = clusterEntries.get(clusterIdx);
      if (!list) {
        list = [];
        clusterEntries.set(clusterIdx, list);
      }
      list.push(id);
    }

    const result: ConceptCluster[] = [];
    let clusterIdx = 0;

    for (const [idx, entryIds] of clusterEntries) {
      const centroid = centroids[idx];
      if (!centroid) continue;

      const cluster: ConceptCluster = {
        id: `cluster_${clusterIdx++}`,
        label: `Concept Cluster ${clusterIdx}`,
        entryIds,
        centroid,
        size: entryIds.length,
      };

      this.clusters.set(cluster.id, cluster);
      result.push(cluster);
    }

    return result;
  }

  /**
   * Get all concept clusters.
   */
  getClusters(): ConceptCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get the entries belonging to a specific cluster.
   */
  async getClusterEntries(clusterId: string): Promise<{ meta: MemoryEntryMeta; value: unknown }[]> {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return [];

    const results: { meta: MemoryEntryMeta; value: unknown }[] = [];
    const response = await this.store.query({
      layer: 'SEMANTIC',
      limit: 1_000_000,
      offset: 0,
    });

    const idSet = new Set(cluster.entryIds);
    for (const r of response.results) {
      if (idSet.has(r.entry.id)) {
        results.push({ meta: r.entry, value: r.value });
      }
    }

    return results;
  }

  /**
   * Add a relationship between two semantic entries.
   */
  addRelationship(relationship: SemanticRelationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Get relationships for a given entry.
   */
  getRelationships(entryId: string): SemanticRelationship[] {
    return this.relationships.filter(
      (r) => r.sourceId === entryId || r.targetId === entryId,
    );
  }

  /**
   * Get the current configuration.
   */
  getConfig(): SemanticMemoryConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private rerankBySemanticSimilarity(
    results: { entry: MemoryEntryMeta; value: unknown; score: number }[],
    queryEmbedding: number[],
  ): { entry: MemoryEntryMeta; value: unknown; score: number }[] {
    return results
      .map((r) => {
        const vec = this.vectors.get(r.entry.id);
        const semanticScore = vec
          ? this.computeSimilarity(queryEmbedding, vec)
          : 0;
        return { ...r, score: semanticScore };
      })
      .filter((r) => r.score >= this.config.minSimilarity)
      .sort((a, b) => b.score - a.score);
  }

  private computeSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    switch (this.config.similarityMetric) {
      case 'cosine': {
        const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        if (normA === 0 || normB === 0) return 0;
        return dot / (normA * normB);
      }
      case 'euclidean': {
        const dist = Math.sqrt(
          a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0),
        );
        return 1 / (1 + dist); // Convert distance to similarity
      }
      case 'dotProduct': {
        return a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
      }
      default: {
        return 0;
      }
    }
  }

  private computeDistance(a: number[], b: number[]): number {
    // Euclidean distance for clustering
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + (val - (b[i] ?? 0)) ** 2, 0),
    );
  }

  private initializeCentroids(
    vectors: [string, number[]][],
    k: number,
  ): number[][] {
    // K-means++ initialization
    const centroids: number[][] = [];
    const firstIdx = Math.floor(Math.random() * vectors.length);
    centroids.push([...(vectors[firstIdx]?.[1] ?? [])]);

    for (let i = 1; i < k; i++) {
      const distances = vectors.map(([, vec]) => {
        const minDist = Math.min(
          ...centroids.map((c) => this.computeDistance(vec, c)),
        );
        return minDist * minDist;
      });
      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let threshold = Math.random() * totalDist;
      let chosenIdx = 0;
      for (let j = 0; j < distances.length; j++) {
        threshold -= distances[j] ?? 0;
        if (threshold <= 0) {
          chosenIdx = j;
          break;
        }
      }
      centroids.push([...(vectors[chosenIdx]?.[1] ?? [])]);
    }

    return centroids;
  }

  private removeFromClusters(entryId: string): void {
    for (const [clusterId, cluster] of this.clusters) {
      const idx = cluster.entryIds.indexOf(entryId);
      if (idx !== -1) {
        cluster.entryIds.splice(idx, 1);
        cluster.size = cluster.entryIds.length;
        if (cluster.entryIds.length === 0) {
          this.clusters.delete(clusterId);
        }
      }
    }
  }

  private removeRelationships(entryId: string): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.relationships.length; i++) {
      const rel = this.relationships[i];
      if (rel && (rel.sourceId === entryId || rel.targetId === entryId)) {
        toRemove.push(i);
      }
    }
    for (const idx of toRemove.reverse()) {
      this.relationships.splice(idx, 1);
    }
  }
}
