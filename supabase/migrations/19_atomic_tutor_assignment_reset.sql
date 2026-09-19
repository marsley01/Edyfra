-- Migration: 19_atomic_tutor_assignment_reset.sql
-- Description: Create atomic reset_daily_tutor_assignments function and schedule via pg_cron at midnight EAT.

BEGIN;

-- 1. Create atomic stored function
CREATE OR REPLACE FUNCTION reset_daily_tutor_assignments()
RETURNS void AS $$
BEGIN
  UPDATE "TutorProfile"
  SET "total_assignments_today" = 0
  WHERE "total_assignments_today" > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Schedule native pg_cron job at midnight EAT (21:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('reset-daily-tutor-assignments');
EXCEPTION WHEN OTHERS THEN
  -- Job did not exist yet
END $$;

SELECT cron.schedule(
  'reset-daily-tutor-assignments',
  '0 21 * * *',
  $$ SELECT reset_daily_tutor_assignments(); $$
);

COMMIT;
