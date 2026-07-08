type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

interface ListenerEntry<T> {
  handler: EventHandler<T>;
  once: boolean;
}

export interface HistoryEntry<T> {
  payload: T;
  timestamp: number;
}

export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<
    keyof EventMap,
    Set<ListenerEntry<EventMap[keyof EventMap]>>
  >();

  private readonly history: Partial<Record<keyof EventMap, HistoryEntry<unknown>[]>> = {};
  private readonly maxHistory: number;

  constructor(maxHistory = 0) {
    this.maxHistory = maxHistory;
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): () => void {
    return this.addListener(event, handler, false);
  }

  once<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): () => void {
    return this.addListener(event, handler, true);
  }

  private addListener<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    once: boolean,
  ): () => void {
    let entries = this.listeners.get(event);

    if (entries === undefined) {
      entries = new Set();
      this.listeners.set(event, entries);
    }

    const entry: ListenerEntry<EventMap[keyof EventMap]> = {
      handler: handler as EventHandler<EventMap[keyof EventMap]>,
      once,
    };

    entries.add(entry);

    return () => {
      entries?.delete(entry);
    };
  }

  off<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    const entries = this.listeners.get(event);

    if (entries === undefined) {
      return;
    }

    for (const entry of entries) {
      if (entry.handler === (handler as EventHandler<EventMap[keyof EventMap]>)) {
        entries.delete(entry);
        break;
      }
    }

    if (entries.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.addToHistory(event, payload);

    const entries = this.listeners.get(event);

    if (entries === undefined) {
      return;
    }

    const toRemove: Array<ListenerEntry<EventMap[keyof EventMap]>> = [];

    for (const entry of entries) {
      if (entry.once) {
        toRemove.push(entry);
      }

      const result = entry.handler(payload);

      if (result instanceof Promise) {
        result.catch((error: Error) => {
          console.error(
            `[TypedEventEmitter] Unhandled error in handler for "${String(event)}":`,
            error,
          );
        });
      }
    }

    for (const entry of toRemove) {
      entries.delete(entry);
    }

    if (entries.size === 0) {
      this.listeners.delete(event);
    }
  }

  async emitAsync<K extends keyof EventMap>(
    event: K,
    payload: EventMap[K],
  ): Promise<void> {
    this.addToHistory(event, payload);

    const entries = this.listeners.get(event);

    if (entries === undefined) {
      return;
    }

    const toRemove: Array<ListenerEntry<EventMap[keyof EventMap]>> = [];
    const promises: Promise<void>[] = [];

    for (const entry of entries) {
      if (entry.once) {
        toRemove.push(entry);
      }

      const result = entry.handler(payload);

      if (result instanceof Promise) {
        promises.push(result);
      }
    }

    for (const entry of toRemove) {
      entries.delete(entry);
    }

    if (entries.size === 0) {
      this.listeners.delete(event);
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  getHistory<K extends keyof EventMap>(event: K): HistoryEntry<EventMap[K]>[] {
    return (this.history[event] ?? []) as HistoryEntry<EventMap[K]>[];
  }

  clearHistory(event?: keyof EventMap): void {
    if (event !== undefined) {
      delete this.history[event];
    } else {
      for (const key of Object.keys(this.history) as Array<keyof EventMap>) {
        delete this.history[key];
      }
    }
  }

  removeAllListeners(event?: keyof EventMap): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private addToHistory<K extends keyof EventMap>(
    event: K,
    payload: EventMap[K],
  ): void {
    if (this.maxHistory <= 0) {
      return;
    }

    let entries = this.history[event];

    if (entries === undefined) {
      entries = [];
      this.history[event] = entries;
    }

    entries.push({ payload, timestamp: Date.now() });

    while (entries.length > this.maxHistory) {
      entries.shift();
    }
  }
}
