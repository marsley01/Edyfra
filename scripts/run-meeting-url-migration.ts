/**
 * Run the add_meeting_url migration against Supabase
 * Usage: npx tsx scripts/run-meeting-url-migration.ts
 */
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = `ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_url TEXT;`;

  console.log(`[migration] Adding meeting_url column to bookings...`);

  const { error } = await supabase.rpc("exec_raw_sql", { sql_text: sql });
  if (error) {
    console.log(`    ⚠ RPC failed: ${error.message}`);
    console.log(`    → Run this SQL manually in Supabase Dashboard > SQL Editor:`);
    console.log(sql);
  } else {
    console.log(`    ✓ Done`);
  }
}

main().catch((e) => {
  console.error("[migration] Fatal:", e);
  process.exit(1);
});
