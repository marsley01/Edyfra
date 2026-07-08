# API Reference

## Overview

Edyfra exposes two API surfaces:

1. **Server Actions** — form-based mutations (login, signup, data updates)
2. **REST API Routes** — JSON endpoints for external integrations

## Server Actions

All server actions are located in `src/app/actions/`. They accept `FormData` and return `Promise<ActionResult>`.

### Common Action Pattern

```typescript
"use server";

export async function someAction(formData: FormData) {
  const { user } = await requireAuth();
  // ... logic
  return { success: true, data: result };
}
```

## REST API Routes

### Health

```
GET /api/health
→ { status: "ok", timestamp: "2024-01-01T00:00:00.000Z" }
```

### Statistics

```
GET /api/stats
→ { totalUsers: number, totalTutors: number, totalSessions: number }
```

### Contact Form

```
POST /api/contact
Body: { name: string, email: string, subject: string, message: string }
→ { success: true }
```

### Newsletter

```
POST /api/newsletter
Body: { email: string }
→ { success: true, message: string }
```

### Stream Tokens

```
GET /api/stream/token?userId=<id>
→ { token: string }

GET /api/stream/video-token?userId=<id>&callId=<id>
→ { token: string }

GET /api/stream/check
→ { status: "ok" | "missing_keys", configured: boolean }
```

### Push Notifications

```
POST /api/push/subscribe
Body: { endpoint: string, keys: { p256dh: string, auth: string } }
→ { success: true }

POST /api/push/unsubscribe
Body: { endpoint: string }
→ { success: true }

GET /api/push/vapid-public-key
→ { publicKey: string }
```

### M-Pesa Payments

```
POST /api/mpesa/stk-push
Body: { phone: string, amount: number }
→ { CheckoutRequestID: string, ResponseCode: string }

POST /api/mpesa/callback
Body: { Body: { stkCallback: { ... } } }
→ { success: true }
```

### Webhooks

```
POST /api/webhooks/stream
Body: { type: string, ...streamPayload }
→ { received: true }

POST /api/webhooks/session-end
Body: { sessionId: string }
→ { success: true }
```

## Authentication

- **Server Actions** — authenticated via `requireAuth()` helper
- **API Routes** — check `Authorization` header or Supabase session
- **Webhooks** — validated via `CRON_SECRET` or Stream signature verification

## Rate Limiting

All API routes are rate-limited via Upstash Redis:

| Route | Rate Limit |
|-------|-----------|
| `/api/auth/*` | 5 requests/minute |
| `/api/contact` | 3 requests/minute |
| `/api/newsletter` | 2 requests/minute |
| `/api/ai` | 10 requests/minute |
| Others | 50 requests/minute |
