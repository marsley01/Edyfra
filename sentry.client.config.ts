import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",

  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },

  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "cancelled",
  ],
});
