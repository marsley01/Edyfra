import { eventBus } from "@/core/events";
import { logger } from "@/core/logging";

export type NotificationType =
  | "match_found"
  | "new_message"
  | "session_reminder"
  | "session_starting"
  | "new_review"
  | "achievement_unlocked"
  | "level_up"
  | "challenge_available"
  | "referral_bonus"
  | "payment_received"
  | "payment_failed"
  | "tutor_request"
  | "booking_confirmed"
  | "institution_invite"
  | "system_announcement"
  | "resource_approved"
  | "account_update";

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  actionUrl?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  send(payload: NotificationPayload): Promise<void>;
}

export class InAppNotificationChannel implements NotificationChannel {
  async send(payload: NotificationPayload): Promise<void> {
    try {
      const prisma = (await import("@/lib/prisma")).default;
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          actionUrl: payload.actionUrl,
          read: false,
        },
      });
      eventBus.emit("notification:created", payload, "notifications", payload.userId);
    } catch (err) {
      logger.error("In-app notification failed", { userId: payload.userId, error: String(err) });
    }
  }
}

export class PushNotificationChannel implements NotificationChannel {
  async send(payload: NotificationPayload): Promise<void> {
    try {
      const { sendNotificationPush } = await import("@/app/actions/push");
      await sendNotificationPush(payload.userId, {
        title: payload.title,
        body: payload.body,
        url: payload.actionUrl,
      });
    } catch {
      logger.warn("Push notification failed", { userId: payload.userId, type: payload.type });
    }
  }
}

export class NotificationService {
  private channels: NotificationChannel[] = [];

  constructor() {
    this.channels.push(new InAppNotificationChannel());
  }

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  enablePush(): void {
    const hasPush = this.channels.some((c) => c instanceof PushNotificationChannel);
    if (!hasPush) {
      this.channels.push(new PushNotificationChannel());
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.send(payload);
      } catch {
        logger.warn("Notification channel failed", {
          channel: channel.constructor.name,
          userId: payload.userId,
        });
      }
    }
  }

  async sendToMany(payloads: NotificationPayload[]): Promise<void> {
    await Promise.allSettled(
      payloads.map((payload) => this.send(payload)),
    );
  }

  async broadcast(payload: Omit<NotificationPayload, "userId">, userIds: string[]): Promise<void> {
    await this.sendToMany(
      userIds.map((userId) => ({ ...payload, userId })),
    );
  }
}

export const notifications = new NotificationService();
