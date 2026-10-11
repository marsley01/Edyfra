-- Heartbeat for live match requests.
--
-- A request used to count as "this student is here and searching" purely by
-- its age (up to 90s), so a student who closed the tab could still be paired.
-- The searching client now refreshes lastSeenAt on every poll (every 3s);
-- matching only considers requests seen in the last few seconds.
-- Nullable and additive: older code ignores the column.
ALTER TABLE "MatchRequest" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "MatchRequest_lastSeenAt_idx" ON "MatchRequest" ("lastSeenAt");
