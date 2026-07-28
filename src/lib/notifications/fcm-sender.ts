import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "@/lib/firebase-admin";

export interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  clickAction?: string;
}

/**
 * Sends a Firebase Cloud Messaging push notification immediately
 * to an array of device tokens.
 */
export async function sendFCMNotification(
  tokens: string[],
  payload: FCMNotificationPayload
) {
  if (!tokens || tokens.length === 0) return { success: 0, failure: 0 };

  try {
    // Ensure admin app is initialized
    const app = getAdminApp();
    const messaging = getMessaging(app);

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon && { imageUrl: payload.icon }),
      },
      webpush: {
        fcmOptions: {
          link: payload.clickAction || "/",
        },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
        }
      });
      // A robust implementation would then remove failedTokens from the user's DB record
    }

    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return { success: 0, failure: tokens.length };
  }
}
