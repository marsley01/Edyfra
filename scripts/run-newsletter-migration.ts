/**
 * Run the newsletter_subscribers migration using Prisma's raw SQL execution.
 * This uses the already-configured DATABASE_URL from .env.
 * Usage: npx tsx scripts/run-newsletter-migration.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[migration] Creating newsletter_subscribers table...");

  // Create table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT NOT NULL UNIQUE,
      subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source        TEXT NOT NULL DEFAULT 'landing_page'
    )
  `);
  console.log("  ✓ Table created");

  // Create indexes
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
      ON newsletter_subscribers (email)
  `);
  console.log("  ✓ Email index created");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at
      ON newsletter_subscribers (subscribed_at DESC)
  `);
  console.log("  ✓ Subscribed_at index created");

  // Enable RLS
  await prisma.$executeRawUnsafe(`
    ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY
  `);
  console.log("  ✓ RLS enabled");

  // RLS Policies — drop first to be idempotent
  const policies = [
    {
      name: "newsletter_insert_anon",
      sql: `CREATE POLICY "newsletter_insert_anon" ON newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true)`,
    },
    {
      name: "newsletter_select_deny_all",
      sql: `CREATE POLICY "newsletter_select_deny_all" ON newsletter_subscribers FOR SELECT USING (false)`,
    },
    {
      name: "newsletter_no_update",
      sql: `CREATE POLICY "newsletter_no_update" ON newsletter_subscribers FOR UPDATE USING (false)`,
    },
    {
      name: "newsletter_no_delete",
      sql: `CREATE POLICY "newsletter_no_delete" ON newsletter_subscribers FOR DELETE USING (false)`,
    },
  ];

  for (const p of policies) {
    try {
      await prisma.$executeRawUnsafe(
        `DROP POLICY IF EXISTS "${p.name}" ON newsletter_subscribers`
      );
      await prisma.$executeRawUnsafe(p.sql);
      console.log(`  ✓ Policy "${p.name}" created`);
    } catch (err: any) {
      console.log(`  ⚠ Policy "${p.name}": ${err.message?.substring(0, 80)}`);
    }
  }

  console.log("\n[migration] ✓ All done!");
}

main()
  .catch((e) => {
    console.error("[migration] Fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
