export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  status: number;
  ok: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface InfiniteResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export type ServerActionResponse<T = void> =
  | { success: true; data?: T }
  | { error: string };

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  key: string;
  value: string | number | boolean | null;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
}
