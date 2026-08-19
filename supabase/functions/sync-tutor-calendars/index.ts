// ============================================
// SYNC TUTOR CALENDARS - Supabase Edge Function
// Called by pg_cron every 6 hours (see
// supabase/migrations/20260820000002_tutor_calendar_sync.sql).
// Re-imports iCal feeds for every tutor with auto_sync enabled.
//
// Setup:
//   - CRON_SECRET env var: if set, requests must send
//     `Authorization: Bearer <CRON_SECRET>` (the pg_cron job sends it from
//     `app_settings.cron_secret`).
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseIcalToBlocks } from "../_shared/ical.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

function hexId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

serve(async (req: Request) => {
  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret) {
      const auth = req.headers.get("Authorization") || "";
      if (auth !== `Bearer ${cronSecret}`) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase
      .from("tutor_calendar_settings")
      .select("tutor_id, ical_url")
      .eq("auto_sync", true)
      .not("ical_url", "is", null);

    if (settingsError) throw new Error(`Failed to load settings: ${settingsError.message}`);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + 30 * DAY_MS);
    let synced = 0;
    let alreadyExisted = 0;
    const failures: string[] = [];

    for (const setting of settings ?? []) {
      const tutorId = setting.tutor_id as string;
      const icalUrl = setting.ical_url as string;

      try {
        const res = await fetch(icalUrl, {
          headers: { Accept: "text/calendar, text/plain, */*" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text.includes("BEGIN:VEVENT")) throw new Error("Not a valid iCal feed");

        const blocks = parseIcalToBlocks(text, { windowStart: now, windowEnd });

        if (blocks.length > 0) {
          const uids = blocks.map((b) => b.externalUid);
          const { data: existing } = await supabase
            .from("tutor_availability_blocks")
            .select("external_uid")
            .eq("tutor_id", tutorId)
            .in("external_uid", uids);

          const existingSet = new Set((existing ?? []).map((r) => r.external_uid));
          const existed = blocks.filter((b) => existingSet.has(b.externalUid)).length;

          const rows = blocks.map((b) => ({
            id: `${hexId(tutorId)}_${b.externalUid.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}`.slice(0, 72),
            tutor_id: tutorId,
            start_at: b.startAt,
            end_at: b.endAt,
            source: "google_calendar",
            external_uid: b.externalUid,
          }));

          const { error: upsertError } = await supabase
            .from("tutor_availability_blocks")
            .upsert(rows, { onConflict: "tutor_id,external_uid" });

          if (upsertError) throw new Error(upsertError.message);

          synced += rows.length - existed;
          alreadyExisted += existed;
        }

        await supabase
          .from("tutor_availability_blocks")
          .delete()
          .eq("tutor_id", tutorId)
          .eq("source", "google_calendar")
          .lt("end_at", now.toISOString());

        await supabase
          .from("tutor_calendar_settings")
          .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("tutor_id", tutorId);
      } catch (err) {
        failures.push(`${tutorId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        already_existed: alreadyExisted,
        failures,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});