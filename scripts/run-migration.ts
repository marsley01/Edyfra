/**
 * Run the newsletter_subscribers migration against Supabase
 * Usage: npx tsx scripts/run-migration.ts
 */
import * as dotenv from "dotenv";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sql = fs.readFileSync("supabase/migrations/09_newsletter_subscribers.sql", "utf8");

  // Split by semicolons, ignoring comments
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[migration] Connected to ${SUPABASE_URL}`);
  console.log(`[migration] Running ${statements.length} statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, " ").substring(0, 80);
    console.log(`  [${i + 1}/${statements.length}] ${preview}...`);

    const { error } = await supabase.rpc("exec_raw_sql", { sql_text: stmt });
    if (error) {
      // Fallback: try the Supabase REST approach with raw SQL via Postgrest
      // If rpc doesn't exist, we'll need to use the SQL editor
      console.log(`    ⚠ RPC failed: ${error.message}`);
      console.log(`    → Run this statement manually in Supabase Dashboard > SQL Editor`);
    } else {
      console.log(`    ✓ Done`);
    }
  }

  console.log("\n[migration] Complete!");
  console.log(
    "\nNOTE: If any statements failed via RPC, copy the full SQL from\n" +
    "  supabase/migrations/09_newsletter_subscribers.sql\n" +
    "and run it in Supabase Dashboard > SQL Editor."
  );
}

main().catch((e) => {
  console.error("[migration] Fatal:", e);
  process.exit(1);
});
