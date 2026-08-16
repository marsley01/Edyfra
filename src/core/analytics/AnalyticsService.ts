import { logger } from "@/core/logging";

export type AnalyticsEventType =
  | "page_view"
  | "signup"
  | "login"
  | "session_started"
  | "session_ended"
  | "resource_downloaded"
  | "resource_uploaded"
  | "tutor_matched"
  | "message_sent"
  | "call_started"
  | "call_ended"
  | "challenge_completed"
  | "achievement_earned"
  | "payment_made"
  | "payment_received"
  | "search_performed"
  | "profile_updated"
  | "feature_used";

export interface AnalyticsEvent {
  event: AnalyticsEventType;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): Promise<void>;
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
}

export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  async track(event: AnalyticsEvent): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      logger.info(`[Analytics] ${event.event}`, {
        userId: event.userId,
        ...event.properties,
      });
    }
  }

  async identify(userId: string, traits?: Record<string, unknown>): Promise<void> {
    logger.info(`[Analytics] Identify: ${userId}`, traits);
  }
}

export class VercelAnalyticsProvider implements AnalyticsProvider {
  async track(event: AnalyticsEvent): Promise<void> {
    try {
      const { track } = await import("@vercel/analytics");
      track(event.event, event.properties as Record<string, string | number | boolean>);
    } catch {
      // Vercel analytics may not be available in all environments
    }
  }

  async identify(_userId: string, _traits?: Record<string, unknown>): Promise<void> {
    // Vercel analytics doesn't support identify
  }
}

export class DatabaseAnalyticsProvider implements AnalyticsProvider {
  async track(event: AnalyticsEvent): Promise<void> {
    try {
      const prisma = (await import("@/lib/prisma")).default;
      await (prisma as any).analyticsEvent.create({
        data: {
          userId: event.userId || "anonymous",
          eventType: event.event,
          metadata: event.properties || {},
          createdAt: event.timestamp,
        },
      });
    } catch {
      logger.warn("Database analytics failed", { event: event.event });
    }
  }

  async identify(_userId: string, _traits?: Record<string, unknown>): Promise<void> {
    // No-op for database analytics
  }
}

export class AnalyticsService {
  private providers: AnalyticsProvider[] = [];

  constructor() {
    this.providers.push(new DatabaseAnalyticsProvider());

    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      this.providers.push(new VercelAnalyticsProvider());
    }

    if (process.env.NODE_ENV === "development") {
      this.providers.push(new ConsoleAnalyticsProvider());
    }
  }

  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }

  async track(event: AnalyticsEventType, properties?: Record<string, unknown>, userId?: string): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      event,
      userId,
      properties,
      timestamp: new Date().toISOString(),
    };

    await Promise.allSettled(
      this.providers.map((provider) => provider.track(analyticsEvent)),
    );
  }

  async identify(userId: string, traits?: Record<string, unknown>): Promise<void> {
    await Promise.allSettled(
      this.providers.map((provider) => provider.identify(userId, traits)),
    );
  }
}

export const analytics = new AnalyticsService();

export function trackEvent(event: AnalyticsEventType, properties?: Record<string, unknown>, userId?: string): void {
  analytics.track(event, properties, userId);
}

export function useAnalytics() {
  const track = (event: AnalyticsEventType, properties?: Record<string, unknown>) => {
    analytics.track(event, properties);
  };
  return { track };
}
