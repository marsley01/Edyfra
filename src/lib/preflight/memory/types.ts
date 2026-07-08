import type {
  MemoryLayer,
  AgentId,
  Timestamp,
  Duration,
  Bytes,
  Percentage,
} from '@agent-preflight/types';

// =============================================================================
// Extended Memory Entry
// =============================================================================

/**
 * Extended metadata attached to every memory entry in the multi-layer system.
 * Builds on the core MemoryEntry from @agent-preflight/types with additional
 * fields for lifecycle management, security, and performance tracking.
 */
export interface MemoryEntryMeta {
  /** Unique entry identifier (UUID v7). */
  id: string;
  /** Logical memory layer this entry belongs to. */
  layer: MemoryLayer;
  /** The agent that owns this entry. */
  agentId: AgentId;
  /** Optional session identifier for session-scoped entries. */
  sessionId?: string | undefined;
  /** ISO 8601 timestamp of creation. */
  timestamp: Timestamp;
  /** Time-to-live in milliseconds. null means permanent. */
  ttl: Duration | null;
  /** Entry priority (0 = lowest, 100 = highest). Used for eviction decisions. */
  priority: number;
  /** Arbitrary tags for fast filtering and categorization. */
  tags: string[];
  /** Whether the entry value is encrypted at rest. */
  encrypted: boolean;
  /** Serialized entry size in bytes. */
  size: Bytes;
  /** SHA-256 checksum of the serialized value for integrity verification. */
  checksum: string | null;
}

// =============================================================================
// Memory Query & Results
// =============================================================================

/**
 * Extended query parameters for searching memory entries across layers.
 * Includes layer-specific filters, relevance tuning, and pagination.
 */
export interface MemoryQuery {
  /** Filter by specific memory layer. */
  layer?: MemoryLayer | undefined;
  /** Filter by agent that owns the entries. */
  agentId?: AgentId | undefined;
  /** Filter by session identifier. */
  sessionId?: string | undefined;
  /** Filter by tags (entries matching ANY specified tag). */
  tags?: string[] | undefined;
  /** Filter by creation/update time range. */
  timeRange?: { start?: Timestamp | undefined; end?: Timestamp | undefined } | undefined;
  /** Full-text search query string. */
  query?: string | undefined;
  /** Embedding vector for semantic similarity search. */
  embedding?: number[] | undefined;
  /** Minimum similarity/relevance score threshold (0-1). */
  relevance?: number | undefined;
  /** Maximum number of results to return. */
  limit: number;
  /** Number of results to skip (for pagination). */
  offset: number;
  /** Arbitrary key-value filter conditions. */
  filters?: Record<string, unknown> | undefined;
}

/**
 * A single search result with a relevance score indicating how well the
 * entry matched the query.
 */
export interface MemorySearchResult {
  /** The matched memory entry metadata. */
  entry: MemoryEntryMeta;
  /** The deserialised entry value (may be null if access denied). */
  value: unknown;
  /** Relevance score between 0 and 1 (1 = perfect match). */
  score: number;
  /** Optional explanation of why this result was matched. */
  explanation?: string | undefined;
}

/**
 * Paginated response envelope for memory queries.
 */
export interface MemorySearchResponse {
  /** The ranked list of search results. */
  results: MemorySearchResult[];
  /** Total number of matching entries (before pagination). */
  total: number;
  /** The query that produced these results. */
  query: MemoryQuery;
  /** Wall-clock time the query took in milliseconds. */
  duration: Duration;
}

// =============================================================================
// Memory Statistics
// =============================================================================

/**
 * Aggregated statistics for a memory store or layer.
 */
export interface MemoryStats {
  /** Total number of entries across all layers. */
  totalEntries: number;
  /** Total storage size in bytes across all layers. */
  totalSize: Bytes;
  /** Per-layer breakdown of entry count and size. */
  byLayer: Partial<Record<MemoryLayer, { entries: number; size: Bytes }>>;
  /** Cache hit rate as a percentage (0-100). */
  hitRate: Percentage;
  /** Number of cache misses since last reset. */
  misses: number;
  /** Number of cache hits since last reset. */
  hits: number;
  /** Timestamp of the oldest entry in the store. */
  oldestEntry: Timestamp | null;
  /** Timestamp of the newest entry in the store. */
  newestEntry: Timestamp | null;
}

// =============================================================================
// Per-Layer Configuration
// =============================================================================

/**
 * Configuration for a single memory layer.
 * Each layer in the multi-tier system can be tuned independently.
 */
export interface MemoryLayerConfig {
  /** Maximum storage size in bytes for this layer (0 = unlimited). */
  maxSize: Bytes;
  /** Default TTL for entries in this layer in milliseconds (null = permanent). */
  ttl: Duration | null;
  /** Maximum number of entries allowed in this layer (0 = unlimited). */
  maxEntries: number;
  /** Whether to encrypt entries at rest in this layer. */
  encryption: boolean;
  /** Whether this layer persists data to disk / database. */
  persistence: boolean;
  /** Maximum priority value for this layer (used for admission control). */
  maxPriority?: number | undefined;
  /** Whether to enable compression for stored values. */
  compression?: boolean | undefined;
}

// =============================================================================
// Shared Memory Permissions
// =============================================================================

/**
 * Permission levels for cross-agent memory access.
 */
export type MemoryPermission = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';

/**
 * Access control entry for a shared memory namespace.
 */
export interface MemoryAccessControl {
  /** Agent or team identifier that has access. */
  principalId: string;
  /** Permission level granted to this principal. */
  permission: MemoryPermission;
  /** Optional list of tag-based filters restricting visibility. */
  tagFilters?: string[] | undefined;
  /** ISO 8601 timestamp when this access expires. */
  expiresAt?: Timestamp | undefined;
}

// =============================================================================
// Knowledge Graph Types
// =============================================================================

/**
 * A node (entity) in the knowledge graph.
 */
export interface GraphEntity {
  /** Unique entity identifier. */
  id: string;
  /** Entity type (e.g. "Person", "Concept", "Document"). */
  type: string;
  /** Human-readable label or name. */
  label: string;
  /** Arbitrary properties on the entity. */
  properties: Record<string, unknown>;
  /** ISO 8601 timestamp of creation. */
  createdAt: Timestamp;
  /** ISO 8601 timestamp of last update. */
  updatedAt: Timestamp;
}

/**
 * A directed edge (relationship) in the knowledge graph.
 */
export interface GraphRelationship {
  /** Unique relationship identifier. */
  id: string;
  /** The subject entity ID (source node). */
  subject: string;
  /** The predicate / relationship type (e.g. "WORKS_FOR", "LOCATED_IN"). */
  predicate: string;
  /** The object entity ID (target node). */
  object: string;
  /** Arbitrary properties on the relationship. */
  properties: Record<string, unknown>;
  /** Confidence score 0-1 indicating certainty of this relationship. */
  confidence: number;
  /** ISO 8601 timestamp of creation. */
  createdAt: Timestamp;
}

/**
 * A triple in subject-predicate-object form.
 */
export interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

// =============================================================================
// Vector Index Types
// =============================================================================

/**
 * Configuration for a vector index.
 */
export interface VectorIndexConfig {
  /** Dimensionality of the embedding vectors. */
  dimension: number;
  /** Similarity metric used for distance calculations. */
  metric: 'cosine' | 'euclidean' | 'dotProduct';
  /** Number of clusters for IVF-based indices. */
  nClusters?: number | undefined;
  /** Number of probes during search (higher = more accurate but slower). */
  nProbes?: number | undefined;
  /** Whether to normalize vectors to unit length. */
  normalize?: boolean | undefined;
}

/**
 * A single vector entry in the vector store.
 */
export interface VectorEntry {
  /** Unique identifier linking back to the memory entry. */
  id: string;
  /** The embedding vector. */
  vector: number[];
  /** Optional metadata associated with this vector. */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Result of a vector similarity search.
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  vector: number[];
  metadata?: Record<string, unknown> | undefined;
}

// =============================================================================
// Event Types for Memory Operations
// =============================================================================

/**
 * Events emitted by the memory system for observability and sync.
 */
export type MemoryEventType =
  | 'ENTRY_CREATED'
  | 'ENTRY_UPDATED'
  | 'ENTRY_DELETED'
  | 'ENTRY_EXPIRED'
  | 'LAYER_CLEARED'
  | 'CONSOLIDATION_RUN'
  | 'INDEX_REBUILT'
  | 'ERROR';

/**
 * Payload for memory system events.
 */
export interface MemoryEvent {
  type: MemoryEventType;
  layer: MemoryLayer;
  agentId?: AgentId | undefined;
  entryId?: string | undefined;
  timestamp: Timestamp;
  details?: Record<string, unknown> | undefined;
}

// =============================================================================
// Consolidation Strategy
// =============================================================================

/**
 * Strategy used for consolidating long-term memory.
 */
export type ConsolidationStrategy =
  | 'importance_threshold'
  | 'recency_weighted'
  | 'frequency_weighted'
  | 'semantic_clustering'
  | 'summary_compression';
