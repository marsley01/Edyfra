import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { checkAdminAccess } from "@/app/actions/admin-auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";

const GATEWAY_SCOPES = [
  "subjects.read",
  "tutors.read",
  "tutors.match",
  "rooms.read",
  "sessions.book",
  "resources.read",
  "ai.query",
  "institutions.read",
  "analytics.read",
  "webhooks.send",
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(100),
  app_name: z.string().min(1).max(100),
  scopes: z.array(z.enum(GATEWAY_SCOPES)).min(1),
  rate_limit_per_hour: z.number().int().min(1).max(100000).default(200),
  monthly_call_limit: z.number().int().min(1).max(10_000_000).default(20000),
  expires_at: z.string().datetime().optional().nullable(),
});

/**
 * Generates a gateway API key in the exact format the FastAPI gateway expects:
 * edyfra_{prefix}_{urlsafe_base64(32 bytes)}, hashed with SHA-256 before storage.
 */
function generateGatewayKey(prefix: string) {
  const randomString = crypto.randomBytes(32).toString("base64url");
  const rawKey = `edyfra_${prefix}_${randomString}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, keyHash };
}

function requireAdmin() {
  const supabase = createAdminClient();
  return { supabase };
}

async function assertAdmin(): Promise<boolean> {
  const { allowed } = await checkAdminAccess();
  return allowed;
}

export async function GET(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const { supabase } = requireAdmin();

  try {
    // Usage-log series for a single key (drives the analytics chart)
    if (id) {
      const { data: logs, error } = await supabase
        .from("api_usage_logs")
        .select("created_at, status_code, endpoint")
        .eq("api_key_id", id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const byDay = new Map<string, { calls: number; errors: number }>();
      for (const log of logs ?? []) {
        const day = log.created_at?.slice(0, 10) ?? "unknown";
        const entry = byDay.get(day) ?? { calls: 0, errors: 0 };
        entry.calls += 1;
        if ((log.status_code ?? 200) >= 400) entry.errors += 1;
        byDay.set(day, entry);
      }

      return NextResponse.json({
        usage: Array.from(byDay.entries()).map(([day, v]) => ({ day, ...v })),
      });
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select(
        "id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, rotating_from, rotation_grace_until, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ keys: keys ?? [] });
  } catch (err) {
    console.error("[api-keys] GET failed:", err);
    const message = err instanceof Error ? err.message : "Failed to load API keys";
    return NextResponse.json({ error: "Failed to load API keys", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { supabase } = requireAdmin();

  try {
    const prefix = parsed.data.app_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 8) || "ext";

    const { rawKey, keyHash } = generateGatewayKey(prefix);

    const { data: record, error } = await supabase
      .from("api_keys")
      .insert({
        name: parsed.data.name,
        app_name: parsed.data.app_name,
        key_hash: keyHash,
        key_prefix: `edyfra_${prefix}`,
        scopes: parsed.data.scopes,
        is_active: true,
        rate_limit_per_hour: parsed.data.rate_limit_per_hour,
        monthly_call_limit: parsed.data.monthly_call_limit,
        calls_this_month: 0,
        expires_at: parsed.data.expires_at ?? null,
      })
      .select(
        "id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, expires_at, created_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      key: {
        id: record.id,
        name: record.name,
        app_name: record.app_name,
        key: rawKey, // shown exactly once
        scopes: record.scopes,
        rate_limit_per_hour: record.rate_limit_per_hour,
        monthly_call_limit: record.monthly_call_limit,
        expires_at: record.expires_at,
      },
    });
  } catch (err) {
    console.error("[api-keys] POST failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create API key";
    return NextResponse.json({ error: "Failed to create API key", detail: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/api-keys/rotate?id=<keyId>
 * Rotates a key: the old hash moves to rotating_from with a 7-day grace period
 * so in-flight clients keep working, while a fresh key is issued.
 */
export async function PATCH(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing key id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== "rotate" && action !== "revoke") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { supabase } = requireAdmin();

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("api_keys")
      .select("key_hash, name, app_name, scopes, rate_limit_per_hour, monthly_call_limit, expires_at")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    if (action === "revoke") {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, revoked: true });
    }

    // --- rotate ---
    const { rawKey, keyHash } = generateGatewayKey(
      existing.app_name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8) || "ext"
    );

    const { data: record, error } = await supabase
      .from("api_keys")
      .update({
        key_hash: keyHash,
        rotating_from: existing.key_hash,
        rotation_grace_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        calls_this_month: 0,
        last_used_at: null,
      })
      .eq("id", id)
      .select(
        "id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, expires_at, rotation_grace_until"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      key: {
        id: record.id,
        name: record.name,
        app_name: record.app_name,
        key: rawKey, // shown exactly once
        scopes: record.scopes,
        rotation_grace_until: record.rotation_grace_until,
      },
    });
  } catch (err) {
    console.error("[api-keys] PATCH failed:", err);
    const message = err instanceof Error ? err.message : "Failed to update API key";
    return NextResponse.json({ error: "Failed to update API key", detail: message }, { status: 500 });
  }
}