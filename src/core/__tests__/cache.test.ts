import { describe, it, expect, vi } from "vitest";
import { CacheService, MemoryCacheAdapter } from "@/core/cache/CacheService";

describe("MemoryCacheAdapter", () => {
  it("stores and retrieves values", () => {
    const adapter = new MemoryCacheAdapter();
    adapter.set("key1", "value1");
    expect(adapter.get("key1")).toBe("value1");
  });

  it("returns null for missing keys", () => {
    const adapter = new MemoryCacheAdapter();
    expect(adapter.get("nonexistent")).toBeNull();
  });

  it("deletes values", () => {
    const adapter = new MemoryCacheAdapter();
    adapter.set("key1", "value1");
    adapter.delete("key1");
    expect(adapter.get("key1")).toBeNull();
  });

  it("respects TTL", async () => {
    const adapter = new MemoryCacheAdapter();
    adapter.set("key1", "value1", 10);
    expect(adapter.get("key1")).toBe("value1");
  });

  it("has returns correct value", () => {
    const adapter = new MemoryCacheAdapter();
    expect(adapter.has("missing")).toBe(false);
    adapter.set("key1", "value1");
    expect(adapter.has("key1")).toBe(true);
  });

  it("clear empties store", () => {
    const adapter = new MemoryCacheAdapter();
    adapter.set("key1", "value1");
    adapter.clear();
    expect(adapter.get("key1")).toBeNull();
  });
});

describe("CacheService", () => {
  it("getOrSet calls fn on cache miss", async () => {
    const cache = new CacheService();
    const fn = vi.fn().mockResolvedValue("computed");
    const result = await cache.getOrSet("key", fn);
    expect(result).toBe("computed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("getOrSet returns cached value on cache hit", async () => {
    const cache = new CacheService();
    await cache.set("key", "cached");
    const fn = vi.fn().mockResolvedValue("computed");
    const result = await cache.getOrSet("key", fn);
    expect(result).toBe("cached");
    expect(fn).not.toHaveBeenCalled();
  });

  it("memoize wraps a function", async () => {
    const cache = new CacheService();
    const fn = vi.fn().mockResolvedValue(42);
    const memoized = cache.memoize(fn, "memo-key");

    const result1 = await memoized();
    const result2 = await memoized();
    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
