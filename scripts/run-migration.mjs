#!/usr/bin/env node
/**
 * Run a SQL migration file against Supabase via Prisma db execute.
 * Uses DIRECT_URL (port 5432, direct connection) — required for DDL.
 * Usage:  node scripts/run-migration.mjs <path/to/file.sql>
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/run-migration.mjs <path/to/file.sql>");
  process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is missing from .env");
  process.exit(1);
}

console.log(`[migrate] File:  ${filePath}`);
console.log(`[migrate] URL:   ${url.replace(/:[^:@/]+@/, ":***@")}`);
console.log(`[migrate] Bytes: ${readFileSync(filePath).length}`);
console.log("");

const preview = readFileSync(filePath, "utf8");
console.log("--- SQL preview (first 400 chars) ---");
console.log(preview.slice(0, 400) + (preview.length > 400 ? "..." : ""));
console.log("--------------------------------------\n");

console.log("[migrate] Running: npx prisma db execute --url <DIRECT_URL> --file ...");
const result = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--url", url, "--file", filePath, "--schema", "prisma/schema.prisma"],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  console.error(`\n[migrate] prisma db execute exited with code ${result.status}`);
  console.error("\nFallback options:");
  console.error("  1) Supabase Dashboard > SQL Editor > paste file contents > Run");
  console.error("  2) psql \"$DIRECT_URL\" -f " + filePath);
  process.exit(result.status ?? 1);
}

console.log("\n[migrate] ✓ Migration applied successfully");
console.log("[migrate] Next: run `npm run db:generate` to refresh the Prisma client.");
