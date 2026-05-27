/**
 * Dev probe: compare Supabase table name casing (no secrets logged).
 */
import { createClient } from "@supabase/supabase-js";
import { appendFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? "service" : "anon";
const logPath = join(process.cwd(), "debug-c9fc04.log");

function log(hypothesisId: string, message: string, data: Record<string, unknown>) {
  appendFileSync(
    logPath,
    JSON.stringify({
      sessionId: "c9fc04",
      runId: "probe-script",
      hypothesisId,
      location: "scratch/probe-supabase-tables.ts",
      message,
      data,
      timestamp: Date.now(),
    }) + "\n"
  );
}

async function probeTable(table: string, hypothesisId: string) {
  if (!url || !key) {
    log(hypothesisId, "missing supabase env", { table, ok: false });
    return;
  }
  const supabase = createClient(url, key);
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  log(hypothesisId, "table probe", {
    keyType,
    table,
    ok: !error,
    count: count ?? null,
    errorCode: (error as { code?: string })?.code ?? null,
    errorMessage: error?.message ?? null,
  });
}

async function probeColumns(table: string, columns: string, hypothesisId: string) {
  if (!url || !key) return;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from(table).select(columns).limit(1);
  log(hypothesisId, "column probe", {
    keyType,
    table,
    columns,
    ok: !error,
    rowCount: data?.length ?? 0,
    errorMessage: error?.message ?? null,
  });
}

async function main() {
  await probeTable("user", "A-lowercase");
  await probeTable("User", "A-pascal");
  await probeTable("session", "B-lowercase");
  await probeTable("Session", "B-pascal");
  await probeColumns("user", "subscription_tier,daily_search_count", "A-cols-snake");
  await probeColumns("user", "subscriptionTier,dailySearchCount", "A-cols-camel");
  await probeColumns("User", "id,name,points,educationLevel", "C-leaderboard-cols");
  await probeColumns("user", "id,name,points,educationLevel", "C-leaderboard-cols-lowercase");
  await probeColumns("Session", "id,studentId,partnerId", "B-session-cols");
  await probeColumns("session", "id,studentId,partnerId", "B-session-cols-lowercase");
  await probeColumns("User", "subscriptionTier,dailySearchCount,dailyMessageCount", "A-cols-prisma");
  await probeColumns("User", "subscription_tier,daily_search_count,daily_message_count", "A-cols-snake-user");
}

main().catch((e) => {
  log("Z", "probe failed", { message: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
