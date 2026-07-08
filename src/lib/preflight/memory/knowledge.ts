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
  GraphEntity,
  GraphRelationship,
  Triple,
} from './types';
import type { SaveOptions, OptimizeResult, MemoryStore } from './store';

// =============================================================================
// Knowledge Graph Memory
// =============================================================================

/**
 * Configuration for the Knowledge Graph layer.
 */
export interface KnowledgeGraphConfig {
  /** Maximum storage size in bytes. */
  maxSize: Bytes;
  /** Maximum number of entities. */
  maxEntities: number;
  /** Maximum number of relationships. */
  maxRelationships: number;
  /** Whether to persist data. */
  persistence: boolean;
}

const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeGraphConfig = {
  maxSize: 1 * 1024 * 1024 * 1024,
  maxEntities: 100_000,
  maxRelationships: 1_000_000,
  persistence: true,
};

/**
 * Result of a graph traversal.
 */
export interface TraversalResult {
  /** Entities visited during traversal. */
  entities: GraphEntity[];
  /** Relationships traversed. */
  relationships: GraphRelationship[];
  /** Path of entity IDs from source to target. */
  path: string[];
}

/**
 * SPARQL-like query for the knowledge graph.
 */
export interface GraphQuery {
  /** Filter by entity type (e.g. "Person"). */
  entityType?: string | undefined;
  /** Filter by relationship predicate (e.g. "WORKS_FOR"). */
  predicate?: string | undefined;
  /** Subject entity ID (for relationship queries). */
  subjectId?: string | undefined;
  /** Object entity ID (for relationship queries). */
  objectId?: string | undefined;
  /** Property filter conditions on entities. */
  propertyFilters?: Record<string, unknown> | undefined;
  /** Maximum results. */
  limit: number;
  /** Pagination offset. */
  offset: number;
}

/**
 * Result of a graph query.
 */
export interface GraphQueryResult {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  total: number;
}

// =============================================================================
// Knowledge Graph
// =============================================================================

/**
 * Knowledge Graph Memory — structured knowledge representation.
 *
 * Stores entities (nodes) with properties and relationships (edges) between
 * them, enabling graph traversal, pattern matching, and semantic queries.
 *
 * Features:
 * - Entity storage with arbitrary properties
 * - Relationship storage with typed predicates
 * - Graph traversal (BFS, DFS, shortest path)
 * - Triple store (subject-predicate-object)
 * - SPARQL-like query support
 * - Adjacency list indexing for efficient graph operations
 */
export class KnowledgeGraph implements MemoryStore {
  public readonly layer: MemoryLayer = 'KNOWLEDGE_GRAPH';
  private readonly config: KnowledgeGraphConfig;
  private readonly store: InMemoryMemoryStore;
  private readonly entities = new Map<string, GraphEntity>();
  private readonly relationships = new Map<string, GraphRelationship>();

  /** Adjacency list: entity ID → set of relationship IDs (outgoing). */
  private readonly adjacencyOut = new Map<string, Set<string>>();
  /** Adjacency list: entity ID → set of relationship IDs (incoming). */
  private readonly adjacencyIn = new Map<string, Set<string>>();

  constructor(config?: Partial<KnowledgeGraphConfig> | undefined) {
    this.config = { ...DEFAULT_KNOWLEDGE_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: null,
      maxEntries: this.config.maxEntities + this.config.maxRelationships,
      encryption: false,
      persistence: this.config.persistence,
    };

    this.store = new InMemoryMemoryStore({
      KNOWLEDGE_GRAPH: layerConfig,
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
    return this.store.save(layer, key, value, {
      ...options,
      ttl: null,
    });
  }

  async get(
    layer: MemoryLayer,
    key: string,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    return this.store.get(layer, key);
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    return this.store.query({ ...query, layer: 'KNOWLEDGE_GRAPH' });
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    return this.store.delete(layer, key);
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    const count = await this.store.clear(layer, agentId);
    this.entities.clear();
    this.relationships.clear();
    this.adjacencyOut.clear();
    this.adjacencyIn.clear();
    return count;
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
    this.entities.clear();
    this.relationships.clear();
    this.adjacencyOut.clear();
    this.adjacencyIn.clear();
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    return this.store.optimize();
  }

  // ---------------------------------------------------------------------------
  // Entity Operations
  // ---------------------------------------------------------------------------

  /**
   * Add or update an entity in the knowledge graph.
   */
  async addEntity(entity: Omit<GraphEntity, 'createdAt' | 'updatedAt'>): Promise<GraphEntity> {
    const now = new Date().toISOString();
    const existing = this.entities.get(entity.id);

    const newEntity: GraphEntity = {
      ...entity,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.entities.set(entity.id, newEntity);
    return newEntity;
  }

  /**
   * Get an entity by ID.
   */
  getEntity(entityId: string): GraphEntity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Delete an entity and all its relationships.
   */
  async deleteEntity(entityId: string): Promise<boolean> {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remove all relationships involving this entity
    const toRemove: string[] = [];

    const outgoing = this.adjacencyOut.get(entityId);
    if (outgoing) {
      for (const relId of outgoing) {
        toRemove.push(relId);
      }
    }

    const incoming = this.adjacencyIn.get(entityId);
    if (incoming) {
      for (const relId of incoming) {
        toRemove.push(relId);
      }
    }

    for (const relId of toRemove) {
      this.relationships.delete(relId);
    }

    this.adjacencyOut.delete(entityId);
    this.adjacencyIn.delete(entityId);
    this.entities.delete(entityId);

    return true;
  }

  /**
   * Search entities by type and/or property filters.
   */
  searchEntities(query: GraphQuery): GraphEntity[] {
    let results = Array.from(this.entities.values());

    if (query.entityType) {
      results = results.filter((e) => e.type === query.entityType);
    }

    if (query.propertyFilters) {
      results = results.filter((e) =>
        Object.entries(query.propertyFilters ?? {}).every(
          ([key, value]) => e.properties[key] === value,
        ),
      );
    }

    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return results.slice(query.offset, query.offset + query.limit);
  }

  /**
   * Count entities matching the given type.
   */
  countEntities(type?: string | undefined): number {
    if (!type) return this.entities.size;
    let count = 0;
    for (const entity of this.entities.values()) {
      if (entity.type === type) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Relationship Operations
  // ---------------------------------------------------------------------------

  /**
   * Add a relationship between two entities.
   */
  async addRelationship(
    relationship: Omit<GraphRelationship, 'id' | 'createdAt'>,
  ): Promise<GraphRelationship> {
    const id = `rel_${relationship.subject}_${relationship.predicate}_${relationship.object}_${Date.now()}`;
    const now = new Date().toISOString();

    const newRelationship: GraphRelationship = {
      ...relationship,
      id,
      createdAt: now,
    };

    this.relationships.set(id, newRelationship);

    // Update adjacency lists
    let out = this.adjacencyOut.get(relationship.subject);
    if (!out) {
      out = new Set();
      this.adjacencyOut.set(relationship.subject, out);
    }
    out.add(id);

    let inAdj = this.adjacencyIn.get(relationship.object);
    if (!inAdj) {
      inAdj = new Set();
      this.adjacencyIn.set(relationship.object, inAdj);
    }
    inAdj.add(id);

    return newRelationship;
  }

  /**
   * Get a relationship by ID.
   */
  getRelationship(relationshipId: string): GraphRelationship | undefined {
    return this.relationships.get(relationshipId);
  }

  /**
   * Delete a relationship.
   */
  async deleteRelationship(relationshipId: string): Promise<boolean> {
    const rel = this.relationships.get(relationshipId);
    if (!rel) return false;

    this.relationships.delete(relationshipId);

    this.adjacencyOut.get(rel.subject)?.delete(relationshipId);
    this.adjacencyIn.get(rel.object)?.delete(relationshipId);

    return true;
  }

  /**
   * Query relationships by subject, predicate, and/or object.
   */
  searchRelationships(query: GraphQuery): GraphRelationship[] {
    let results = Array.from(this.relationships.values());

    if (query.subjectId) {
      results = results.filter((r) => r.subject === query.subjectId);
    }
    if (query.predicate) {
      results = results.filter((r) => r.predicate === query.predicate);
    }
    if (query.objectId) {
      results = results.filter((r) => r.object === query.objectId);
    }

    return results.slice(query.offset, query.offset + query.limit);
  }

  /**
   * Count relationships matching optional filters.
   */
  countRelationships(predicate?: string | undefined): number {
    if (!predicate) return this.relationships.size;
    let count = 0;
    for (const rel of this.relationships.values()) {
      if (rel.predicate === predicate) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Triple Store
  // ---------------------------------------------------------------------------

  /**
   * Add a triple (subject-predicate-object) to the graph.
   * Creates entities if they don't exist.
   */
  async addTriple(
    triple: Triple,
    properties?: Record<string, unknown> | undefined,
    confidence?: number | undefined,
  ): Promise<GraphRelationship> {
    // Ensure entities exist
    if (!this.entities.has(triple.subject)) {
      await this.addEntity({
        id: triple.subject,
        type: 'Unknown',
        label: triple.subject,
        properties: {},
      });
    }
    if (!this.entities.has(triple.object)) {
      await this.addEntity({
        id: triple.object,
        type: 'Unknown',
        label: triple.object,
        properties: {},
      });
    }

    return this.addRelationship({
      subject: triple.subject,
      predicate: triple.predicate,
      object: triple.object,
      properties: properties ?? {},
      confidence: confidence ?? 1.0,
    });
  }

  /**
   * Query triples matching the given pattern.
   * Any field can be left undefined as a wildcard.
   */
  queryTriples(pattern: Partial<Triple>): Triple[] {
    let results = Array.from(this.relationships.values());

    if (pattern.subject) {
      results = results.filter((r) => r.subject === pattern.subject);
    }
    if (pattern.predicate) {
      results = results.filter((r) => r.predicate === pattern.predicate);
    }
    if (pattern.object) {
      results = results.filter((r) => r.object === pattern.object);
    }

    return results.map((r) => ({
      subject: r.subject,
      predicate: r.predicate,
      object: r.object,
    }));
  }

  // ---------------------------------------------------------------------------
  // Graph Traversal
  // ---------------------------------------------------------------------------

  /**
   * Breadth-first search from a start entity.
   */
  bfs(startEntityId: string, maxDepth: number = 5): TraversalResult {
    const visited = new Set<string>();
    const queue: { entityId: string; depth: number; path: string[] }[] = [
      { entityId: startEntityId, depth: 0, path: [startEntityId] },
    ];
    visited.add(startEntityId);

    const resultEntities: GraphEntity[] = [];
    const resultRelationships: GraphRelationship[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const entity = this.entities.get(current.entityId);
      if (entity) {
        resultEntities.push(entity);
      }

      if (current.depth >= maxDepth) continue;

      const outgoing = this.adjacencyOut.get(current.entityId);
      if (outgoing) {
        for (const relId of outgoing) {
          const rel = this.relationships.get(relId);
          if (!rel) continue;

          resultRelationships.push(rel);

          if (!visited.has(rel.object)) {
            visited.add(rel.object);
            queue.push({
              entityId: rel.object,
              depth: current.depth + 1,
              path: [...current.path, rel.object],
            });
          }
        }
      }

      // Incoming edges are symmetric via outgoing on other entities
    }

    return {
      entities: resultEntities,
      relationships: resultRelationships,
      path: [startEntityId],
    };
  }

  /**
   * Depth-first search from a start entity.
   */
  dfs(startEntityId: string, maxDepth: number = 5): TraversalResult {
    const visited = new Set<string>();
    const resultEntities: GraphEntity[] = [];
    const resultRelationships: GraphRelationship[] = [];

    const stack: { entityId: string; depth: number; path: string[] }[] = [
      { entityId: startEntityId, depth: 0, path: [startEntityId] },
    ];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current.entityId)) continue;
      visited.add(current.entityId);

      const entity = this.entities.get(current.entityId);
      if (entity) {
        resultEntities.push(entity);
      }

      if (current.depth >= maxDepth) continue;

      const outgoing = this.adjacencyOut.get(current.entityId);
      if (outgoing) {
        for (const relId of outgoing) {
          const rel = this.relationships.get(relId);
          if (!rel || visited.has(rel.object)) continue;
          resultRelationships.push(rel);
          stack.push({
            entityId: rel.object,
            depth: current.depth + 1,
            path: [...current.path, rel.object],
          });
        }
      }
    }

    return {
      entities: resultEntities,
      relationships: resultRelationships,
      path: [startEntityId],
    };
  }

  /**
   * Find the shortest path between two entities using BFS.
   */
  shortestPath(startEntityId: string, targetEntityId: string): string[] | null {
    if (startEntityId === targetEntityId) return [startEntityId];

    const visited = new Set<string>([startEntityId]);
    const queue: { entityId: string; path: string[] }[] = [
      { entityId: startEntityId, path: [startEntityId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      const outgoing = this.adjacencyOut.get(current.entityId);
      if (outgoing) {
        for (const relId of outgoing) {
          const rel = this.relationships.get(relId);
          if (!rel || visited.has(rel.object)) continue;

          const newPath = [...current.path, rel.object];
          if (rel.object === targetEntityId) {
            return newPath;
          }

          visited.add(rel.object);
          queue.push({ entityId: rel.object, path: newPath });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get all entities and relationships reachable from the given entity.
   */
  getSubgraph(rootEntityId: string, depth: number = 2): TraversalResult {
    return this.bfs(rootEntityId, depth);
  }

  // ---------------------------------------------------------------------------
  // Query API
  // ---------------------------------------------------------------------------

  /**
   * Execute a SPARQL-like query against the knowledge graph.
   */
  executeQuery(query: GraphQuery): GraphQueryResult {
    const entities = this.searchEntities(query);
    const relationships = this.searchRelationships(query);

    return {
      entities,
      relationships,
      total: entities.length + relationships.length,
    };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): KnowledgeGraphConfig {
    return { ...this.config };
  }
}
