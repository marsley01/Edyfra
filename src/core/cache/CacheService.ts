export interface CacheAdapter {
  get<T>(key: string): Promise<T | null> | T | null;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  has(key: string): Promise<boolean> | boolean;
}

export class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 60_000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }
}

export class CacheService {
  private adapter: CacheAdapter;

  constructor(adapter?: CacheAdapter) {
    this.adapter = adapter || new MemoryCacheAdapter();
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = await this.adapter.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.adapter.set(key, value, ttlMs);
    return value;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.adapter.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    return this.adapter.delete(key);
  }

  async invalidate(prefix: string): Promise<void> {
    if (this.adapter instanceof MemoryCacheAdapter) {
      return;
    }
    await this.adapter.delete(prefix);
  }

  memoize<T>(fn: () => Promise<T>, key: string, ttlMs?: number): () => Promise<T> {
    return async () => this.getOrSet(key, fn, ttlMs);
  }
}

export const cache = new CacheService();
