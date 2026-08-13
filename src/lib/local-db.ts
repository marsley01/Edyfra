/**
 * local-db.ts — Layer 2: IndexedDB typed wrapper.
 *
 * Provides a simple TTL-aware key-value store per named object store.
 * Everything is lazy-initialized so the DB is only opened when first used.
 *
 * Usage:
 *   import { localDB } from "@/lib/local-db";
 *   await localDB.set("tutors", tutorId, tutor);          // cache a value
 *   const t = await localDB.get<Tutor>("tutors", tutorId); // null if stale
 *   await localDB.clear("bookings");                       // invalidate store
 */

const DB_NAME    = "edyfra-db";
const DB_VERSION = 1;

/** Object stores and their stale-after thresholds (milliseconds) */
export const STORES = {
  tutors:       5 * 60 * 1000,   // 5 min  — tutor profiles
  bookings:     30 * 60 * 1000,  // 30 min — booking lists
  matchResults: 2 * 60 * 1000,   // 2 min  — live matching results
  userProfile:  60 * 60 * 1000,  // 1 hour — authenticated user data
} as const;

export type StoreName = keyof typeof STORES;

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
}

// ── DB singleton ───────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of Object.keys(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };

    request.onsuccess = () => {
      _db = request.result;
      // Handle unexpected version change (tab refresh after a deploy)
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };
      resolve(_db);
    };

    request.onerror = () => reject(request.error);
  });
}

// ── Core operations ────────────────────────────────────────────────────────────

/**
 * Read a value from the cache.
 * Returns `null` if the key doesn't exist or the entry is older than the TTL.
 */
async function get<T>(store: StoreName, key: string): Promise<T | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db  = await openDB();
    const ttl = STORES[store];

    return new Promise((resolve) => {
      const tx  = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);

      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) return resolve(null);
        const age = Date.now() - entry.cachedAt;
        if (age > ttl) return resolve(null); // stale
        resolve(entry.value);
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Write a value to the cache.
 * Silently fails if IndexedDB is unavailable (e.g., private browsing mode).
 */
async function set<T>(store: StoreName, key: string, value: T): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).put({ value, cachedAt: Date.now() } satisfies CacheEntry<T>, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => resolve(); // silent failure is fine for a cache
    });
  } catch {
    // IndexedDB unavailable (e.g., private mode, storage quota) — degrade gracefully
  }
}

/**
 * Delete all entries in a store (e.g., on logout or explicit refresh).
 */
async function clear(store: StoreName): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {
    // silent
  }
}

/**
 * Clear all Edyfra caches — call this on user logout.
 */
async function clearAll(): Promise<void> {
  await Promise.allSettled(
    (Object.keys(STORES) as StoreName[]).map((s) => clear(s))
  );
}

export const localDB = { get, set, clear, clearAll };
