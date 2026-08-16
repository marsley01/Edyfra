#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * Reads the last N git commits and merges them into the changelog data file.
 * Run this after tagging a release:
 *
 *   node scripts/generate-changelog.mjs
 *   # or
 *   npm run changelog:generate
 *
 * The script writes `src/data/changelog-generated.json` which can be imported
 * by `src/data/changelog.ts` as a sidecar. The static entries in changelog.ts
 * always win — git commits are appended as extras for transparency.
 *
 * Requirements: git must be installed and the script must be run from the repo root.
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../src/data/changelog-generated.json");

/** Classify a commit message into a changelog type */
function classify(msg) {
  const lower = msg.toLowerCase();
  if (lower.startsWith("fix") || lower.startsWith("bug")) return "fix";
  if (lower.startsWith("feat") || lower.startsWith("add")) return "highlight";
  if (lower.startsWith("chore") || lower.startsWith("refactor") || lower.startsWith("ci")) return null; // skip housekeeping
  return "highlight";
}

/** Convert a git ISO date to "Month DD, YYYY" */
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function run() {
  // Fetch last 50 commits with structured format
  let rawLog;
  try {
    rawLog = execSync(
      `git log --pretty=format:"%H|||%s|||%ai|||%D" -n 50`,
      { encoding: "utf-8" }
    );
  } catch {
    console.warn("[changelog] git log failed — skipping generation.");
    process.exit(0);
  }

  const lines = rawLog.trim().split("\n").filter(Boolean);

  // Group commits by tag/date into pseudo-versions
  const groups = {};

  for (const line of lines) {
    const [hash, subject, date, refs] = line.split("|||");
    const type = classify(subject);
    if (!type) continue; // skip chores

    // Find a version tag in refs, e.g. "tag: v1.2.3"
    const tagMatch = refs?.match(/tag:\s*v?([\d.]+)/);
    const version = tagMatch ? tagMatch[1] : null;
    const dateLabel = formatDate(date);
    const key = version ?? dateLabel;

    if (!groups[key]) {
      groups[key] = {
        version: version ?? dateLabel,
        date: dateLabel,
        title: version ? `Release v${version}` : `Updates — ${dateLabel}`,
        description: "Commits auto-extracted from git history.",
        highlights: [],
        fixes: [],
      };
    }

    const clean = subject.replace(/^(feat|fix|chore|refactor|ci|docs|style|test|build)(\(.+?\))?:\s*/i, "").trim();
    if (type === "fix") {
      groups[key].fixes.push(clean);
    } else {
      groups[key].highlights.push(clean);
    }
  }

  const entries = Object.values(groups).filter(
    (g) => g.highlights.length > 0 || g.fixes.length > 0
  );

  // Merge with existing generated file to avoid losing manual edits
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    try {
      existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    } catch {}
  }

  const existingVersions = new Set(existing.map((e) => e.version));
  const newEntries = entries.filter((e) => !existingVersions.has(e.version));
  const merged = [...newEntries, ...existing].slice(0, 20); // keep latest 20

  writeFileSync(OUTPUT_PATH, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`[changelog] ✓ Wrote ${merged.length} entries to ${OUTPUT_PATH}`);
}

run();
