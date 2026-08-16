export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;
export type Unsubscribe = () => void;

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  metadata: {
    eventId: string;
    timestamp: string;
    source: string;
    userId?: string;
    correlationId?: string;
  };
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T>(eventType: string, handler: EventHandler<T>): Unsubscribe {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      this.handlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  async emit<T>(eventType: string, payload: T, source = "system", userId?: string, correlationId?: string): Promise<void> {
    const event: DomainEvent<T> = {
      type: eventType,
      payload,
      metadata: {
        eventId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        source,
        userId,
        correlationId,
      },
    };

    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers) {
      try {
        const result = handler(event.payload);
        if (result instanceof Promise) promises.push(result);
      } catch {
        // Individual handler errors are swallowed to prevent cascade
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  once<T>(eventType: string, handler: EventHandler<T>): Unsubscribe {
    const wrapped: EventHandler<T> = (payload) => {
      unsub();
      return handler(payload);
    };
    const unsub = this.on(eventType, wrapped);
    return unsub;
  }

  removeAll(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = EventBus.getInstance();
