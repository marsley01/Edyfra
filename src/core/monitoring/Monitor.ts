"use client";

import { useEffect, useRef, useCallback } from "react";

export type MetricType = "page_view" | "api_call" | "component_render" | "user_action" | "error" | "performance";

export interface MetricEvent {
  type: MetricType;
  name: string;
  value?: number;
  tags?: Record<string, string>;
  timestamp: number;
}

type MetricHandler = (event: MetricEvent) => void;

class Monitor {
  private handlers: MetricHandler[] = [];
  private buffer: MetricEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private enabled = true;

  constructor() {
    if (typeof window !== "undefined") {
      this.flushInterval = setInterval(() => this.flush(), 30_000);
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  track(event: Omit<MetricEvent, "timestamp">): void {
    if (!this.enabled) return;
    this.buffer.push({ ...event, timestamp: Date.now() });
    if (this.buffer.length >= 20) this.flush();
  }

  on(handler: MetricHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const events = this.buffer.splice(0);
    for (const handler of this.handlers) {
      try {
        handler(events[events.length - 1]!);
      } catch {
        // Silently fail
      }
    }
  }

  destroy(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.buffer = [];
    this.handlers = [];
  }
}

export const monitor = typeof window !== "undefined" ? new Monitor() : null;

export function usePageView(pageName: string): void {
  useEffect(() => {
    monitor?.track({ type: "page_view", name: pageName });
  }, [pageName]);
}

export function usePerformanceMark(name: string, deps: unknown[] = []): void {
  const startRef = useRef(performance.now());

  useEffect(() => {
    startRef.current = performance.now();
    return () => {
      const duration = performance.now() - startRef.current;
      if (duration > 16) {
        monitor?.track({ type: "performance", name, value: Math.round(duration) });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useActionMonitoring(actionName: string) {
  const trackAction = useCallback(
    (result?: "success" | "error", details?: Record<string, string>) => {
      monitor?.track({
        type: "user_action",
        name: actionName,
        tags: { result: result || "success", ...details },
      });
    },
    [actionName],
  );

  return { trackAction };
}

export function useAPIMonitoring() {
  const trackAPI = useCallback((endpoint: string, method: string, status: number, durationMs: number) => {
    monitor?.track({
      type: "api_call",
      name: `${method} ${endpoint}`,
      value: durationMs,
      tags: { status: String(status), endpoint },
    });
  }, []);

  return { trackAPI };
}

export function trackError(error: Error, context?: Record<string, string>): void {
  monitor?.track({
    type: "error",
    name: error.name,
    tags: { message: error.message, ...context },
  });
}
