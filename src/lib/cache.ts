/**
 * In-process TTL cache for Edyfra.
 *
 * Design notes:
 * - Zero external dependencies — no Redis required.
 * - Works per-serverless-instance (Vercel). For truly shared caching across
 *   all instances, swap for Upstash Redis in the future.
 * - All TTLs are intentionally short (15 s – 1 hr) so cold-start misses
 *   only cause a single extra DB hit, not stale data issues.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Retrieve a cached value. Returns `undefined` if missing or expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Store a value with a TTL in milliseconds. */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Remove a single key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Remove all keys that start with `prefix`.
   * Use this for group invalidation, e.g. `cache.deleteByPrefix('resources:')`.
   */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Number of live (non-expired) entries currently stored. */
  get size(): number {
    const now = Date.now();
    let count = 0;
    for (const entry of this.store.values()) {
      if (now <= entry.expiresAt) count++;
    }
    return count;
  }

  /** Evict all expired entries. Call periodically if memory is a concern. */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton — shared across all imports within the same serverless instance.
// ---------------------------------------------------------------------------
const globalForCache = globalThis as unknown as { __edyfraCache: TTLCache | undefined };
export const cache = globalForCache.__edyfraCache ?? new TTLCache();
if (process.env.NODE_ENV !== "production") globalForCache.__edyfraCache = cache;

// ---------------------------------------------------------------------------
// TTL constants (milliseconds) — single source of truth.
// ---------------------------------------------------------------------------
export const TTL = {
  /** Public global stats (student count, session count…) */
  GLOBAL_STATS: 5 * 60 * 1000,        // 5 minutes
  /** Pricing plans — changes very rarely */
  PLANS: 60 * 60 * 1000,              // 1 hour
  /** Paginated resource listings */
  RESOURCES: 30 * 1000,               // 30 seconds
  /** Leaderboard rankings */
  LEADERBOARD: 2 * 60 * 1000,         // 2 minutes
  /** Community scholars spotlight */
  COMMUNITY_SCHOLARS: 5 * 60 * 1000,  // 5 minutes
  FEATURE_GATE: 15 * 1000,            // 15 seconds

  // New TTLs for Institution & Platform features
  APPROVED_TUTORS: 5 * 60 * 1000,     // 5 minutes
  INSTITUTION_STUDENTS: 10 * 60 * 1000, // 10 minutes
  KNOWLEDGE_FEED: 30 * 60 * 1000,     // 30 minutes
  PLATFORM_STATS: 5 * 60 * 1000,      // 5 minutes
  CURRICULUM_TOPICS: 60 * 60 * 1000,  // 60 minutes
  SUBJECT_LIST: 60 * 60 * 1000,       // 60 minutes
} as const;

export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) return cached;
  
  const data = await fetchFn();
  cache.set(key, data, ttlMs);
  return data;
}
