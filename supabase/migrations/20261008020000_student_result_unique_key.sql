-- Institution results: one row per (institution, student, subject, term, year).
--
-- Earlier imports inserted a fresh copy of every row on each upload, so
-- re-importing a term duplicated results and skewed every mean. The importer
-- (src/app/actions/_institution-results-import.ts) now replaces rows by this
-- key; this migration removes the historical duplicates (keeping the newest
-- row per key) and enforces the key at the database level.
--
-- NOT YET APPLIED. Review, then run against the database.

BEGIN;

-- 1. Drop duplicate rows, keeping the most recently created one per key.
--    StudentResultsAnalysis rows cascade via their FK (onDelete: Cascade).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY "institutionId", "studentUserId", lower(btrim(subject)), term, year
           ORDER BY "createdAt" DESC, id DESC
         ) AS rn
  FROM "StudentResult"
  WHERE "studentUserId" IS NOT NULL
)
DELETE FROM "StudentResult" r
USING ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

-- 2. Enforce the key (case/whitespace-insensitive on subject).
CREATE UNIQUE INDEX IF NOT EXISTS "StudentResult_student_subject_term_key"
  ON "StudentResult" ("institutionId", "studentUserId", lower(btrim(subject)), term, year)
  WHERE "studentUserId" IS NOT NULL;

-- 3. Supports the analytics queries (per-institution history by student).
CREATE INDEX IF NOT EXISTS "StudentResult_institution_student_idx"
  ON "StudentResult" ("institutionId", "studentUserId", year, term);

COMMIT;
