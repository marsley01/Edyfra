-- ========================================
-- EDIYFRA ROW LEVEL SECURITY POLICIES
-- ========================================
-- Run these in Supabase SQL Editor in order

-- ─── Enable RLS on all user-data tables ────────────────────────────────────

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ──────────────────────────────────────────────────────────────
CREATE POLICY "users_own_profile_only"
  ON profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── SESSIONS ──────────────────────────────────────────────────────────────
CREATE POLICY "session_student_only"
  ON sessions
  FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "session_tutor_only"
  ON sessions
  FOR ALL
  USING (auth.uid() = tutor_id);

-- ─── MESSAGES ──────────────────────────────────────────────────────────────
CREATE POLICY "room_members_only"
  ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM session_members sm
      WHERE sm.session_id = messages.room_id
      AND sm.user_id = auth.uid()
    )
  );

-- ─── BOOKINGS ──────────────────────────────────────────────────────────────
CREATE POLICY "booking_student_only"
  ON bookings
  FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "booking_tutor_only"
  ON bookings
  FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE POLICY "own_notifications_only"
  ON notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── PAYMENTS ──────────────────────────────────────────────────────────────
CREATE POLICY "own_payments_only"
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- ─── AI CONVERSATIONS ──────────────────────────────────────────────────────
CREATE POLICY "own_ai_conversations"
  ON ai_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── CHALLENGE COMPLETIONS ─────────────────────────────────────────────────
CREATE POLICY "own_challenge_completions"
  ON challenge_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── STUDENT RESULTS ───────────────────────────────────────────────────────
CREATE POLICY "student_own_results"
  ON student_results
  FOR SELECT
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.institution_role = 'admin'
      AND p.institution_id = student_results.institution_id
    )
  );

-- ─── PUSH SUBSCRIPTIONS ────────────────────────────────────────────────────
CREATE POLICY "own_push_subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── USER CREDITS ──────────────────────────────────────────────────────────
CREATE POLICY "own_credits_only"
  ON user_credits
  FOR ALL
  USING (auth.uid() = user_id);

-- ─── COACHING ASSIGNMENTS ──────────────────────────────────────────────────
CREATE POLICY "coaching_student_only"
  ON coaching_assignments
  FOR SELECT
  USING (auth.uid() = student_user_id);

CREATE POLICY "coaching_teacher_only"
  ON coaching_assignments
  FOR SELECT
  USING (auth.uid() = teacher_user_id);

-- ─── TUTOR AVAILABILITY ────────────────────────────────────────────────────
CREATE POLICY "own_availability_only"
  ON tutor_availability
  FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- ─── RESOURCE PURCHASES ────────────────────────────────────────────────────
CREATE POLICY "own_purchases_only"
  ON resource_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- ─── REFERRALS ─────────────────────────────────────────────────────────────
CREATE POLICY "own_referrals_only"
  ON referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ─── VERIFY RLS IS ENABLED ─────────────────────────────────────────────────
-- This query must return TRUE for every user-data table
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
