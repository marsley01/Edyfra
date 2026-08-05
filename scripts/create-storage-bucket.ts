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

  console.log(`[storage] Connected to ${SUPABASE_URL}`);

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`[storage] Failed to list buckets: ${listError.message}`);
    process.exit(1);
  }

  const existing = buckets.find((b) => b.name === "resources");
  if (existing) {
    console.log("[storage] 'resources' bucket already exists, updating settings...");
  } else {
    console.log("[storage] Creating 'resources' bucket...");
    const { data, error } = await supabase.storage.createBucket("resources", {
      public: true,
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      fileSizeLimit: 52428800, // 50 MB
    });

    if (error) {
      console.error(`[storage] Failed to create bucket: ${error.message}`);
      console.log("\nTry creating it manually in Supabase Dashboard > Storage:\n" +
        "  1. Go to https://supabase.com/dashboard/project/iosgbkiyuyjjvamqqzks\n" +
        "  2. Click 'Storage' in the left sidebar\n" +
        "  3. Click 'New Bucket'\n" +
        "  4. Name: 'resources'\n" +
        "  5. Public: enabled\n" +
        "  6. Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document\n" +
        "  7. File size limit: 52428800 (50 MB)\n" +
        "  8. Click 'Create bucket'");
      process.exit(1);
    }
    console.log(`[storage] ✓ Bucket 'resources' created (public: true)`);
  }

  // Update bucket to public
  const { error: updateError } = await supabase.storage.updateBucket("resources", {
    public: true,
    allowedMimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    fileSizeLimit: 52428800,
  });

  if (updateError) {
    console.error(`[storage] Failed to update bucket: ${updateError.message}`);
  } else {
    console.log(`[storage] ✓ Bucket 'resources' configured as public`);
  }

  console.log("\n[storage] All done! Files can now be uploaded to the 'resources' bucket.");
}

main().catch((e) => {
  console.error("[storage] Fatal:", e);
  process.exit(1);
});
