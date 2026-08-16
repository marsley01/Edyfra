import type { MemoryLayer, AgentId, Duration, Timestamp, Bytes } from '@agent-preflight/types';
import { v4 as uuidv4 } from 'uuid';
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
// Session Memory
// =============================================================================

/**
 * Configuration for the Session Memory layer.
 */
export interface SessionMemoryConfig {
  /** Maximum size in bytes per session. */
  maxSizePerSession: Bytes;
  /** Default TTL for session entries. */
  ttl: Duration;
  /** Maximum entries per session. */
  maxEntriesPerSession: number;
  /** Maximum number of concurrent sessions. */
  maxSessions: number;
  /** Session idle timeout — session expires if no activity within this period. */
  sessionIdleTimeout: Duration;
}

const DEFAULT_SESSION_CONFIG: SessionMemoryConfig = {
  maxSizePerSession: 10 * 1024 * 1024,
  ttl: 3_600_000, // 1 hour
  maxEntriesPerSession: 5000,
  maxSessions: 1000,
  sessionIdleTimeout: 1_800_000, // 30 minutes
};

/**
 * Represents a named session with its own lifecycle.
 */
export interface Session {
  /** Unique session identifier. */
  id: string;
  /** The agent that owns this session. */
  agentId: AgentId;
  /** Human-readable session label. */
  label: string;
  /** ISO 8601 timestamp of session creation. */
  createdAt: Timestamp;
  /** ISO 8601 timestamp of last activity. */
  lastAccessedAt: Timestamp;
  /** Whether this session is still active. */
  active: boolean;
  /** Arbitrary metadata attached to the session. */
  metadata: Record<string, unknown>;
}

/**
 * Session Memory — medium-lived per-session storage.
 *
 * Used for conversation history, interaction context, and state that should
 * persist across multiple turns within a single session but does not need
 * to survive beyond it.
 *
 * Features:
 * - Automatic session creation and renewal
 * - Session isolation (entries scoped to a session ID)
 * - Session expiry based on idle timeout
 * - Per-session entry limits and size tracking
 */
export class SessionMemory implements MemoryStore {
  public readonly layer: MemoryLayer = 'SESSION';
  private readonly config: SessionMemoryConfig;
  private readonly store: InMemoryMemoryStore;
  private readonly sessions = new Map<string, Session>();

  constructor(config?: Partial<SessionMemoryConfig> | undefined) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };

    const layerConfig: Partial<MemoryLayerConfig> = {
      maxSize: this.config.maxSizePerSession * this.config.maxSessions,
      ttl: this.config.ttl,
      maxEntries: this.config.maxEntriesPerSession * this.config.maxSessions,
      encryption: false,
      persistence: false,
    };

    this.store = new InMemoryMemoryStore({
      SESSION: layerConfig,
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
    const sessionId = options?.sessionId;
    if (!sessionId) {
      throw new Error('SessionMemory.save requires a sessionId in options');
    }

    const session = this.sessions.get(sessionId);
    if (!session || !session.active) {
      throw new Error(`Session "${sessionId}" does not exist or is expired`);
    }

    // Renew session on activity
    session.lastAccessedAt = new Date().toISOString();

    return this.store.save(layer, key, value, {
      ...options,
      ttl: options?.ttl ?? this.config.ttl,
      sessionId,
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
      layer: 'SESSION',
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
    this.sessions.clear();
  }

  async stats(): Promise<MemoryStats> {
    return this.store.stats();
  }

  async optimize(): Promise<OptimizeResult> {
    await this.evictExpiredSessions();
    return this.store.optimize();
  }

  // ---------------------------------------------------------------------------
  // Session Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Create a new session.
   */
  async createSession(
    agentId: AgentId,
    label?: string | undefined,
    metadata?: Record<string, unknown> | undefined,
  ): Promise<Session> {
    // Enforce max sessions limit
    const activeSessions = Array.from(this.sessions.values()).filter((s) => s.active);
    if (activeSessions.length >= this.config.maxSessions) {
      const oldest = activeSessions.sort(
        (a, b) => new Date(a.lastAccessedAt).getTime() - new Date(b.lastAccessedAt).getTime(),
      )[0];
      if (oldest) {
        await this.expireSession(oldest.id);
      }
    }

    const now = new Date();
    const session: Session = {
      id: uuidv4(),
      agentId,
      label: label ?? `Session ${now.toISOString()}`,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      active: true,
      metadata: metadata ?? {},
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Renew a session (reset its idle timer).
   */
  renewSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.active) {
      return false;
    }
    session.lastAccessedAt = new Date().toISOString();
    return true;
  }

  /**
   * Expire (deactivate) a session, optionally clearing its data.
   */
  async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.active = false;
    // Clear all entries for this session
    const response = await this.store.query({
      layer: 'SESSION',
      agentId: session.agentId,
      limit: 1_000_000,
      offset: 0,
    });
    for (const r of response.results) {
      await this.store.delete('SESSION', r.entry.id);
    }
  }

  /**
   * Get a session by ID.
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || !session.active) return undefined;
    return session;
  }

  /**
   * List all active sessions for a given agent.
   */
  listSessions(agentId?: AgentId | undefined): Session[] {
    const all = Array.from(this.sessions.values());
    return all.filter(
      (s) => s.active && (!agentId || s.agentId === agentId),
    );
  }

  /**
   * Get all entries belonging to a specific session.
   */
  async getSessionEntries(sessionId: string): Promise<{ meta: MemoryEntryMeta; value: unknown }[]> {
    const response = await this.store.query({
      layer: 'SESSION',
      sessionId,
      limit: 1_000_000,
      offset: 0,
    });
    return response.results.map((r) => ({ meta: r.entry, value: r.value }));
  }

  /**
   * Get the underlying session configuration.
   */
  getConfig(): SessionMemoryConfig {
    return { ...this.config };
  }

  /**
   * Set a new TTL for session entries.
   */
  setTTL(ttl: Duration): void {
    this.config.ttl = ttl;
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async evictExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [id, session] of this.sessions) {
      if (!session.active) continue;
      const lastAccess = new Date(session.lastAccessedAt).getTime();
      if (now - lastAccess > this.config.sessionIdleTimeout) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      await this.expireSession(id);
    }
  }
}
