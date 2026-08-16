import { logger } from "@/core/logging";
import type { PaginatedResult } from "@/core/database";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestConfig {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  cache?: RequestCache;
  revalidate?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
  status: number;
  ok: boolean;
}

export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private async request<T>(path: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers, params, signal, cache, revalidate } = config;

    const url = this.buildUrl(path, params);

    const fetchOptions: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...headers },
      signal,
    };

    if (cache) fetchOptions.cache = cache;
    if (revalidate !== undefined) {
      (fetchOptions as Record<string, unknown>).next = { revalidate };
    }

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const startTime = performance.now();

    try {
      const response = await fetch(url, fetchOptions);
      const duration = performance.now() - startTime;

      let responseData: ApiResponse<T>;

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const json = await response.json();
        responseData = {
          data: response.ok ? (json as T) : null,
          error: !response.ok ? json.error || { code: "UNKNOWN", message: json.error || "Request failed" } : null,
          status: response.status,
          ok: response.ok,
        };
      } else {
        responseData = {
          data: null,
          error: { code: "PARSE_ERROR", message: "Invalid response format" },
          status: response.status,
          ok: false,
        };
      }

      if (duration > 1000) {
        logger.warn("Slow API request", {
          method,
          path,
          durationMs: Math.round(duration),
          status: response.status,
        });
      }

      return responseData;
    } catch (err) {
      const duration = performance.now() - startTime;

      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          data: null,
          error: { code: "REQUEST_ABORTED", message: "Request was cancelled" },
          status: 0,
          ok: false,
        };
      }

      logger.error("API request failed", {
        method,
        path,
        durationMs: Math.round(duration),
        error: String(err),
      });

      if (err instanceof TypeError && err.message.includes("fetch")) {
        return {
          data: null,
          error: { code: "NETWORK_ERROR", message: "Unable to connect to the server. Check your internet connection." },
          status: 0,
          ok: false,
        };
      }

      return {
        data: null,
        error: { code: "REQUEST_FAILED", message: err instanceof Error ? err.message : "Request failed" },
        status: 0,
        ok: false,
      };
    }
  }

  async get<T>(path: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: "POST", body });
  }

  async put<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: "PUT", body });
  }

  async patch<T>(path: string, body?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: "PATCH", body });
  }

  async delete<T>(path: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...config, method: "DELETE" });
  }

  async getPaginated<T>(path: string, page = 1, limit = 20, config?: ApiRequestConfig): Promise<ApiResponse<PaginatedResult<T>>> {
    return this.get<PaginatedResult<T>>(path, {
      ...config,
      params: { ...config?.params, page: String(page), limit: String(limit) },
    });
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

export const api = new APIClient();
