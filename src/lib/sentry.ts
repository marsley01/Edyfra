import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";

export function captureServerError(error: unknown, context?: Record<string, any>) {
  console.error("Server Error:", error);
  Sentry.captureException(error, {
    extra: context,
    tags: {
      layer: "server_action"
    }
  });
}

export function captureApiError(error: unknown, request?: NextRequest | Request, context?: Record<string, any>) {
  console.error("API Error:", error);
  Sentry.captureException(error, {
    extra: {
      url: request?.url,
      method: request?.method,
      ...context
    },
    tags: {
      layer: "api_route"
    }
  });
}
