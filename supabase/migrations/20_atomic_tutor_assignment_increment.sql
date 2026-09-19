-- Migration: 20_atomic_tutor_assignment_increment.sql
-- Description: Create atomic increment_tutor_assignment RPC function

BEGIN;

CREATE OR REPLACE FUNCTION increment_tutor_assignment(
  p_user_id text,
  p_assigned_at timestamptz DEFAULT now()
)
RETURNS "TutorProfile" AS $$
DECLARE
  v_updated "TutorProfile"%ROWTYPE;
BEGIN
  UPDATE "TutorProfile"
  SET
    "current_active_sessions" = COALESCE("current_active_sessions", 0) + 1,
    "total_assignments_today" = COALESCE("total_assignments_today", 0) + 1,
    "sessions_assigned"       = COALESCE("sessions_assigned", 0) + 1,
    "last_assigned_at"        = p_assigned_at
  WHERE "userId" = p_user_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
