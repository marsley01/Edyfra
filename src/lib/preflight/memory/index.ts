// =============================================================================
// Agent Preflight — Memory Package
// =============================================================================
// Multi-layer memory system for the AI Agent Operating System.
//
// Layers:
//   WORKING      —  Shortest-lived, active task context (seconds–minutes)
//   SESSION      —  Medium-lived, per-session conversation history
//   LONG_TERM    —  Persistent learned patterns and user knowledge
//   SEMANTIC     —  Embedding-based meaning retrieval and concept clustering
//   VECTOR       —  High-dimensional ANN search at scale
//   KNOWLEDGE_GRAPH — Structured entity-relationship knowledge representation
//   ENCRYPTED    —  Transparent AES-256-GCM encryption wrapper
//   SHARED       —  Cross-agent memory with ACL-based access control
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type {
  MemoryEntryMeta,
  MemoryQuery,
  MemorySearchResult,
  MemorySearchResponse,
  MemoryStats,
  MemoryLayerConfig,
  MemoryPermission,
  MemoryAccessControl,
  GraphEntity,
  GraphRelationship,
  Triple,
  VectorIndexConfig,
  VectorEntry,
  VectorSearchResult,
  MemoryEventType,
  MemoryEvent,
  ConsolidationStrategy,
} from './types';

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------
export {
  InMemoryMemoryStore,
} from './store';
export type {
  MemoryStore,
  SaveOptions,
  OptimizeResult,
} from './store';

// -----------------------------------------------------------------------------
// Working Memory
// -----------------------------------------------------------------------------
export { WorkingMemory } from './working';
export type { WorkingMemoryConfig } from './working';

// -----------------------------------------------------------------------------
// Session Memory
// -----------------------------------------------------------------------------
export { SessionMemory } from './session';
export type {
  SessionMemoryConfig,
  Session,
} from './session';

// -----------------------------------------------------------------------------
// Long-Term Memory
// -----------------------------------------------------------------------------
export { LongTermMemory } from './longterm';
export type {
  LongTermMemoryConfig,
  ConsolidationResult,
} from './longterm';

// -----------------------------------------------------------------------------
// Semantic Memory
// -----------------------------------------------------------------------------
export { SemanticMemory } from './semantic';
export type {
  SemanticMemoryConfig,
  ConceptCluster,
  SemanticRelationship,
} from './semantic';

// -----------------------------------------------------------------------------
// Vector Memory
// -----------------------------------------------------------------------------
export { VectorMemory } from './vector';
export type {
  VectorMemoryConfig,
  EmbeddingProvider,
} from './vector';

// -----------------------------------------------------------------------------
// Knowledge Graph
// -----------------------------------------------------------------------------
export { KnowledgeGraph } from './knowledge';
export type {
  KnowledgeGraphConfig,
  TraversalResult,
  GraphQuery,
  GraphQueryResult,
} from './knowledge';

// -----------------------------------------------------------------------------
// Memory Manager
// -----------------------------------------------------------------------------
export { MemoryManager } from './manager';
export type {
  MemoryManagerConfig,
  AllLayerConfigs,
  MemoryUsageReport,
  MemoryManagerConsolidationResult,
} from './manager';

// -----------------------------------------------------------------------------
// Shared Memory
// -----------------------------------------------------------------------------
export { SharedMemory } from './shared';
export type { SharedMemoryConfig } from './shared';
