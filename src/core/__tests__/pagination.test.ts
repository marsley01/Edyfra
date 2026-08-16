import { describe, it, expect } from "vitest";
import { buildPagination, paginateResponse, infiniteResponse } from "@/core/database/Pagination";

describe("buildPagination", () => {
  it("returns correct skip and limit", () => {
    const result = buildPagination({ page: 1, limit: 20 });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(21);
  });

  it("handles page 2", () => {
    const result = buildPagination({ page: 2, limit: 10 });
    expect(result.skip).toBe(10);
    expect(result.take).toBe(11);
  });

  it("caps limit at 100", () => {
    const result = buildPagination({ page: 1, limit: 1000 });
    expect(result.limit).toBe(100);
  });

  it("defaults to page 1", () => {
    const result = buildPagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe("paginateResponse", () => {
  it("returns correct pagination metadata", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const params = buildPagination({ page: 1, limit: 10 });
    const result = paginateResponse(items, 50, params);

    expect(result.data.length).toBe(10);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.hasNextPage).toBe(true);
    expect(result.pagination.hasPreviousPage).toBe(false);
  });

  it("handles last page", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    const params = buildPagination({ page: 5, limit: 10 });
    const result = paginateResponse(items, 45, params);

    expect(result.data.length).toBe(5);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPreviousPage).toBe(true);
  });

  it("handles empty results", () => {
    const params = buildPagination({ page: 1, limit: 10 });
    const result = paginateResponse([], 0, params);
    expect(result.data.length).toBe(0);
    expect(result.pagination.total).toBe(0);
  });
});

describe("infiniteResponse", () => {
  it("returns hasMore when items exceed limit", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i, cursor: String(i) }));
    const result = infiniteResponse(items, 20, (item) => item.cursor);

    expect(result.data.length).toBe(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("19");
  });

  it("returns hasMore false when items fit within limit", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ id: i, cursor: String(i) }));
    const result = infiniteResponse(items, 20, (item) => item.cursor);

    expect(result.data.length).toBe(15);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeUndefined();
  });
});
