export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
  };
}

export interface InfinitePage<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export function buildPagination(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit + 1 };
}

export function paginateResponse<T>(
  items: T[],
  total: number,
  params: ReturnType<typeof buildPagination>,
): PaginatedResult<T> {
  const { page, limit } = params;
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

export function infiniteResponse<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => string,
): InfinitePage<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];

  return {
    data,
    nextCursor: lastItem && hasMore ? getCursor(lastItem) : undefined,
    hasMore,
  };
}
