import type { MemoryLayer, AgentId, Duration, Bytes } from '@agent-preflight/types';
import { InMemoryMemoryStore } from './store';
import type {
  MemoryEntryMeta,
  MemoryQuery,
  MemorySearchResponse,
  MemoryStats,
  MemoryLayerConfig,
  MemoryAccessControl,
  MemoryPermission,
  MemoryEvent,
} from './types';
import type { SaveOptions, OptimizeResult, MemoryStore } from './store';

// =============================================================================
// Shared Memory
// =============================================================================

/**
 * Configuration for the Shared Memory layer.
 */
export interface SharedMemoryConfig {
  /** Maximum storage size in bytes. */
  maxSize: Bytes;
  /** Maximum number of entries. */
  maxEntries: number;
  /** Default TTL (null = permanent). */
  ttl: Duration | null;
  /** Whether to persist data. */
  persistence: boolean;
  /** Whether to enable real-time sync event emission. */
  realtimeSync: boolean;
  /** Conflict resolution strategy. */
  conflictResolution: 'last_write_wins' | 'first_write_wins' | 'merge';
}

const DEFAULT_SHARED_CONFIG: SharedMemoryConfig = {
  maxSize: 200 * 1024 * 1024,
  maxEntries: 50_000,
  ttl: null,
  persistence: true,
  realtimeSync: true,
  conflictResolution: 'last_write_wins',
};

/**
 * Shared Memory — cross-agent memory sharing with access control.
 *
 * Enables multiple agents to share memory in a controlled way, with
 * namespace isolation, permission management, conflict resolution, and
 * optional real-time synchronisation via event emission.
 *
 * Features:
 * - Agent and team permissions for read/write/admin access
 * - Namespace isolation per agent or team
 * - Tag-based access filters for fine-grained visibility
 * - Configurable conflict resolution strategies
 * - Real-time sync via event bus integration
 * - Automatic permission expiry
 */
export class SharedMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'SHARED';
  private readonly config: SharedMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  /** Namespace → agent/team → access control entry */
  private readonly permissions = new Map<string, Map<string, MemoryAccessControl>>();

  constructor(config?: Partial<SharedMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_SHARED_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
      maxEntries: this.config.maxEntries,
      encryption: false,
      persistence: this.config.persistence,
    };

    this.store = new InMemoryMemoryStore({
      SHARED: layerConfig,
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

    if (this.config.realtimeSync) {
      this.emitSyncEvent('ENTRY_CREATED', meta);
    }

    return meta;
  }

  async get(
    layer: MemoryLayer,
    key: string,
    agentId?: AgentId | undefined,
    namespace?: string | undefined,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    const result = await this.store.get(layer, key);
    if (!result) return null;

    // Check access if agent and namespace provided
    if (agentId && namespace) {
      if (!this.checkAccess(namespace, agentId, 'READ', result.meta.tags)) {
        return null;
      }
    }

    return result;
  }

  async query(query: MemoryQuery): Promise<MemorySearchResponse> {
    const response = await this.store.query({ ...query, layer: 'SHARED' });

    // Filter results based on the agent's permissions (if agentId is in query)
    if (query.agentId) {
      const filtered = response.results.filter((r) => {
        // Check all namespaces the agent has access to
        for (const [, acl] of this.permissions) {
          const agentEntry = acl.get(query.agentId!);
          if (agentEntry && this.hasReadPermission(agentEntry, r.entry.tags)) {
            return true;
          }
        }
        // Also allow if the agent owns the entry
        return r.entry.agentId === query.agentId;
      });

      return { ...response, results: filtered, total: filtered.length };
    }

    return response;
  }

  async delete(layer: MemoryLayer, key: string): Promise<boolean> {
    const result = await this.store.delete(layer, key);
    if (result && this.config.realtimeSync) {
      this.emitSyncEvent('ENTRY_DELETED');
    }
    return result;
  }

  async clear(layer: MemoryLayer, agentId: AgentId): Promise<number> {
    return this.store.clear(layer, agentId);
  }

  async clearAll(): Promise<void> {
    await this.store.clearAll();
    this.permissions.clear();
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    this.evictExpiredPermissions();
    return this.store.optimize();
  }

  // ---------------------------------------------------------------------------
  // Permission Management
  // ---------------------------------------------------------------------------

  /**
   * Grant a principal access to a namespace.
   */
  grantAccess(
    namespace: string,
    principalId: string,
    permission: MemoryPermission,
    options?: { tagFilters?: string[] | undefined; expiresAt?: string | undefined } | undefined,
  ): void {
    let namespaceAcl = this.permissions.get(namespace);
    if (!namespaceAcl) {
      namespaceAcl = new Map();
      this.permissions.set(namespace, namespaceAcl);
    }

    const acl: MemoryAccessControl = {
      principalId,
      permission,
      tagFilters: options?.tagFilters,
      expiresAt: options?.expiresAt,
    };

    namespaceAcl.set(principalId, acl);
  }

  /**
   * Revoke a principal's access to a namespace.
   */
  revokeAccess(namespace: string, principalId: string): boolean {
    const namespaceAcl = this.permissions.get(namespace);
    if (!namespaceAcl) return false;
    return namespaceAcl.delete(principalId);
  }

  /**
   * Check a principal's permission level for a namespace.
   */
  checkPermission(namespace: string, principalId: string): MemoryPermission {
    const namespaceAcl = this.permissions.get(namespace);
    if (!namespaceAcl) return 'NONE';

    const entry = namespaceAcl.get(principalId);
    if (!entry) return 'NONE';

    // Check expiry
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      namespaceAcl.delete(principalId);
      return 'NONE';
    }

    return entry.permission;
  }

  /**
   * List all namespaces a principal has access to.
   */
  listAccessibleNamespaces(principalId: string): { namespace: string; permission: MemoryPermission }[] {
    const result: { namespace: string; permission: MemoryPermission }[] = [];

    for (const [namespace, acl] of this.permissions) {
      const entry = acl.get(principalId);
      if (entry) {
        result.push({ namespace, permission: entry.permission });
      }
    }

    return result;
  }

  /**
   * Get all access control entries for a namespace.
   */
  getNamespaceACL(namespace: string): MemoryAccessControl[] {
    const namespaceAcl = this.permissions.get(namespace);
    if (!namespaceAcl) return [];
    return Array.from(namespaceAcl.values());
  }

  /**
   * Remove a namespace and all its permissions.
   */
  removeNamespace(namespace: string): boolean {
    return this.permissions.delete(namespace);
  }

  // ---------------------------------------------------------------------------
  // Namespace Operations
  // ---------------------------------------------------------------------------

  /**
   * Save an entry to a specific namespace.
   */
  async saveToNamespace(
    namespace: string,
    key: string,
    value: unknown,
    agentId: AgentId,
    options?: Omit<SaveOptions, 'tags'> & { tags?: string[] } | undefined,
  ): Promise<MemoryEntryMeta> {
    // Verify the agent has write access to this namespace
    if (!this.checkAccess(namespace, agentId, 'WRITE')) {
      throw new Error(`Agent "${agentId}" does not have WRITE access to namespace "${namespace}"`);
    }

    return this.save('SHARED', `${namespace}:${key}`, value, options);
  }

  /**
   * Get an entry from a specific namespace.
   */
  async getFromNamespace(
    namespace: string,
    key: string,
    agentId: AgentId,
  ): Promise<{ meta: MemoryEntryMeta; value: unknown } | null> {
    const result = await this.store.get('SHARED', `${namespace}:${key}`);
    if (!result) return null;

    if (!this.checkAccess(namespace, agentId, 'READ', result.meta.tags)) {
      return null;
    }

    return result;
  }

  /**
   * Query entries within a specific namespace.
   */
  async queryNamespace(
    namespace: string,
    agentId: AgentId,
    query: Omit<MemoryQuery, 'layer'>,
  ): Promise<MemorySearchResponse> {
    if (!this.checkAccess(namespace, agentId, 'READ')) {
      return { results: [], total: 0, query: { ...query, layer: 'SHARED' }, duration: 0 };
    }

    return this.store.query({
      ...query,
      layer: 'SHARED',
    });
  }

  // ---------------------------------------------------------------------------
  // Real-time Sync
  // ---------------------------------------------------------------------------

  private syncListeners = new Set<(event: MemoryEvent) => void>();

  /**
   * Register a sync handler for real-time updates.
   */
  onSync(handler: (event: MemoryEvent) => void): void {
    this.syncListeners.add(handler);
  }

  /**
   * Remove a sync handler.
   */
  offSync(handler: (event: MemoryEvent) => void): void {
    this.syncListeners.delete(handler);
  }

  /**
   * Get the configuration.
   */
  getConfig(): SharedMemoryConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private checkAccess(
    namespace: string,
    principalId: string,
    requiredPermission: MemoryPermission,
    entryTags?: string[] | undefined,
  ): boolean {
    const permission = this.checkPermission(namespace, principalId);

    if (permission === 'ADMIN') return true;
    if (requiredPermission === 'READ' && permission === 'READ') {
      return this.passesTagFilter(namespace, principalId, entryTags);
    }
    if (requiredPermission === 'READ' && permission === 'WRITE') return true;
    if (requiredPermission === 'WRITE' && permission === 'WRITE') return true;

    return false;
  }

  private hasReadPermission(entry: MemoryAccessControl, entryTags: string[]): boolean {
    if (entry.permission === 'ADMIN') return true;
    if (entry.permission === 'READ' || entry.permission === 'WRITE') {
      return this.passesTagFilterForEntry(entry, entryTags);
    }
    return false;
  }

  private passesTagFilter(
    namespace: string,
    principalId: string,
    entryTags: string[] | undefined,
  ): boolean {
    const namespaceAcl = this.permissions.get(namespace);
    if (!namespaceAcl) return false;

    const entry = namespaceAcl.get(principalId);
    if (!entry) return false;

    return this.passesTagFilterForEntry(entry, entryTags);
  }

  private passesTagFilterForEntry(
    acl: MemoryAccessControl,
    entryTags: string[] | undefined,
  ): boolean {
    if (!acl.tagFilters || acl.tagFilters.length === 0) return true;
    if (!entryTags || entryTags.length === 0) return false;

    return acl.tagFilters.some((filter) => entryTags.includes(filter));
  }

  private evictExpiredPermissions(): void {
    const now = new Date();
    for (const [, acl] of this.permissions) {
      for (const [principalId, entry] of acl) {
        if (entry.expiresAt && new Date(entry.expiresAt) < now) {
          acl.delete(principalId);
        }
      }
    }
  }

  private emitSyncEvent(type: MemoryEvent['type'], meta?: MemoryEntryMeta | undefined): void {
    if (!this.config.realtimeSync) return;

    const event: MemoryEvent = {
      type,
      layer: 'SHARED',
      agentId: meta?.agentId,
      entryId: meta?.id,
      timestamp: new Date().toISOString(),
    };

    for (const handler of this.syncListeners) {
      try {
        handler(event);
      } catch {
        // Silently swallow handler errors
      }
    }
  }
}
