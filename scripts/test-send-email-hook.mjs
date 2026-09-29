/**
 * Local test harness for the Supabase Send Email hook.
 *
 * Builds a Standard Webhooks-signed request with a THROWAWAY secret (read from
 * TEST_HOOK_SECRET) and POSTs it to the local dev server. It never touches
 * Supabase, so it does not consume any of today's auth rate limit.
 *
 *   node scripts/test-send-email-hook.mjs signup you@example.com
 *   node scripts/test-send-email-hook.mjs recovery you@example.com
 *   node scripts/test-send-email-hook.mjs unknown you@example.com
 *   node scripts/test-send-email-hook.mjs badsig you@example.com
 */
import { createHmac } from "node:crypto";

const [, , action = "signup", to = "test@example.com"] = process.argv;
const secret = process.env.TEST_HOOK_SECRET;
if (!secret) {
  console.error("Set TEST_HOOK_SECRET to a throwaway base64 secret first.");
  process.exit(1);
}

// Normalize exactly like the route does: strip the v1, / whsec_ prefixes and
// use the base64 secret bytes as the HMAC key.
const key = Buffer.from(secret.trim().replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qwwuniqsjtgkvfdqjcrs.supabase.co";

const ACTION_TYPES = {
  signup: "signup",
  recovery: "recovery",
  unknown: "magiclink",
};

// Sign whatever action was asked for; "unknown" uses a real but unhandled type.
const emailActionType = ACTION_TYPES[action] || "signup";

const payload = {
  user: {
    id: "8484b834-f29e-4af2-bf42-80644d154f76",
    aud: "authenticated",
    role: "authenticated",
    email: to,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      email: to,
      email_verified: false,
      phone_verified: false,
      sub: "8484b834-f29e-4af2-bf42-80644d154f76",
      name: "Test <script>alert(1)</script> User",
    },
    identities: [],
    created_at: "2026-09-29T09:00:00.000Z",
    updated_at: "2026-09-29T09:00:00.000Z",
    is_anonymous: false,
  },
  email_data: {
    token: "305805",
    token_hash: "7d5b7b1964cf5d388340a7f04f1dbb5eeb6c7b52ef8270e1737a58d0",
    redirect_to: "https://www.edyfra.online/auth/callback?next=/update-password",
    email_action_type: emailActionType,
    site_url: "https://www.edyfra.online",
    token_new: "",
    token_hash_new: "",
    old_email: "",
    old_phone: "",
    provider: "",
    factor_type: "",
  },
};

const body = JSON.stringify(payload);
const id = `msg_${Math.random().toString(36).slice(2, 14)}`;
const timestamp = Math.floor(Date.now() / 1000).toString();

let signature = `v1,${createHmac("sha256", key)
  .update(`${id}.${timestamp}.${body}`)
  .digest("base64")}`;

if (action === "badsig") {
  signature = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
}

const port = process.env.PORT || "3000";
const res = await fetch(`http://localhost:${port}/api/auth/send-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": signature,
  },
  body,
});

const text = await res.text();
console.log(`action=${action} email_action_type=${emailActionType}`);
console.log(`status=${res.status} content-type=${res.headers.get("content-type")}`);
console.log(`retry-after=${JSON.stringify(res.headers.get("retry-after"))}`);
console.log(`body=${text}`);
