-- ════════════════════════════════════════════════════════════════════════════════════
-- EDYFRA V2 - COMPLETE ROW LEVEL SECURITY & PRODUCTION SETUP
-- Generated: 2026-05-07 | Production Ready
-- This file creates RLS policies, admin functions, and production features
-- ════════════════════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 1: ENABLE EXTENSIONS
-- ════════════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- ═══════════════════════════════════════════════════════════════════════════��════════
-- STEP 2: ENABLE ROW LEVEL SECURITY (Once per table - NO DUPLICATES)
-- ════════════════════════════════════════════════════════════════════════════════════
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyChallengeAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StruggleGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 3: CREATE ADMIN CHECK FUNCTION (Case-Insensitive - Aligned with PR #2)
-- ════════════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
DECLARE user_role TEXT;
BEGIN -- Check Supabase user metadata first (case-insensitive for alignment with app)
SELECT raw_user_meta_data->>'role' INTO user_role
FROM auth.users
WHERE id = auth.uid();
IF UPPER(COALESCE(user_role, '')) = 'ADMIN' THEN RETURN TRUE;
END IF;
-- Check Prisma User table (fallback, also case-insensitive)
SELECT role INTO user_role
FROM "User"
WHERE id = auth.uid()::text
LIMIT 1;
IF UPPER(COALESCE(user_role, '')) = 'ADMIN' THEN RETURN TRUE;
END IF;
RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 4: DROP EXISTING POLICIES (Clean slate - prevents conflicts)
-- ════════════════════════════════════════════════════════════════════════════════════
-- Drop all existing policies (if rerunning)
DROP POLICY IF EXISTS "Users can view all users" ON "User";
DROP POLICY IF EXISTS "Users can update their own data" ON "User";
DROP POLICY IF EXISTS "Admin full access on User" ON "User";
DROP POLICY IF EXISTS "Public read StudentProfile" ON "StudentProfile";
DROP POLICY IF EXISTS "Self update StudentProfile" ON "StudentProfile";
DROP POLICY IF EXISTS "Admin full access on StudentProfile" ON "StudentProfile";
DROP POLICY IF EXISTS "Public read TutorProfile" ON "TutorProfile";
DROP POLICY IF EXISTS "Self update TutorProfile" ON "TutorProfile";
DROP POLICY IF EXISTS "Admin full access on TutorProfile" ON "TutorProfile";
DROP POLICY IF EXISTS "Users view own match requests" ON "MatchRequest";
DROP POLICY IF EXISTS "Admin full access on MatchRequest" ON "MatchRequest";
DROP POLICY IF EXISTS "Participants can view session" ON "Session";
DROP POLICY IF EXISTS "Admin full access on Session" ON "Session";
DROP POLICY IF EXISTS "Participants can view messages" ON "Message";
DROP POLICY IF EXISTS "Admin full access on Message" ON "Message";
DROP POLICY IF EXISTS "Users view own reviews" ON "Review";
DROP POLICY IF EXISTS "Admin full access on Review" ON "Review";
DROP POLICY IF EXISTS "Public can view challenges" ON "DailyChallenge";
DROP POLICY IF EXISTS "Admin full access on DailyChallenge" ON "DailyChallenge";
DROP POLICY IF EXISTS "Users can view own attempts" ON "DailyChallengeAttempt";
DROP POLICY IF EXISTS "Users can insert own attempts" ON "DailyChallengeAttempt";
DROP POLICY IF EXISTS "Admin full access on DailyChallengeAttempt" ON "DailyChallengeAttempt";
DROP POLICY IF EXISTS "Users view struggle groups" ON "StruggleGroup";
DROP POLICY IF EXISTS "Admin full access on StruggleGroup" ON "StruggleGroup";
DROP POLICY IF EXISTS "Users view own tutor applications" ON "TutorApplication";
DROP POLICY IF EXISTS "Admin full access on TutorApplication" ON "TutorApplication";
DROP POLICY IF EXISTS "Users view own notifications" ON "Notification";
DROP POLICY IF EXISTS "Admin full access on Notification" ON "Notification";
DROP POLICY IF EXISTS "Public can view feed posts" ON "FeedPost";
DROP POLICY IF EXISTS "Admin full access on FeedPost" ON "FeedPost";
DROP POLICY IF EXISTS "Users manage own likes" ON "PostLike";
DROP POLICY IF EXISTS "Admin full access on PostLike" ON "PostLike";
DROP POLICY IF EXISTS "Public can view comments" ON "Comment";
DROP POLICY IF EXISTS "Admin full access on Comment" ON "Comment";
DROP POLICY IF EXISTS "Users view own achievements" ON "Achievement";
DROP POLICY IF EXISTS "Admin full access on Achievement" ON "Achievement";
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 5: CREATE ALL POLICIES (Unique names, proper logic)
-- ═════════════════════════════════════════════════════════════════════��══════════════
-- ─────────────────────────────────────────────────────────────────────────────────────
-- USER TABLE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view all users (public directory)
CREATE POLICY "Users can view all users" ON "User" FOR
SELECT USING (true);
-- Users can update their own profile
CREATE POLICY "Users can update their own data" ON "User" FOR
UPDATE USING (auth.uid()::text = id);
-- Admins have full access (all operations)
CREATE POLICY "Admin full access on User" ON "User" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- STUDENT PROFILE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view student profiles
CREATE POLICY "Public read StudentProfile" ON "StudentProfile" FOR
SELECT USING (true);
-- Users can update their own profile
CREATE POLICY "Self update StudentProfile" ON "StudentProfile" FOR
UPDATE USING (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on StudentProfile" ON "StudentProfile" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- TUTOR PROFILE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view tutor profiles (for tutors discovery)
CREATE POLICY "Public read TutorProfile" ON "TutorProfile" FOR
SELECT USING (true);
-- Tutors can update their own profile
CREATE POLICY "Self update TutorProfile" ON "TutorProfile" FOR
UPDATE USING (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on TutorProfile" ON "TutorProfile" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- MATCH REQUEST POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Students can view their own match requests
-- Students and tutors can view their own match requests
CREATE POLICY "Users view own match requests" ON "MatchRequest" FOR
SELECT USING (
    auth.uid()::text = "studentId"
    OR auth.uid()::text = "tutorId"
  );
-- Admins have full access
CREATE POLICY "Admin full access on MatchRequest" ON "MatchRequest" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- SESSION POLICIES
-- ────────��────────────────────────────────────────────────────────────────────────────
-- Only session participants can view the session
CREATE POLICY "Participants can view session" ON "Session" FOR
SELECT USING (
    auth.uid()::text = "studentId"
    OR auth.uid()::text = "partnerId"
  );
-- Admins have full access
CREATE POLICY "Admin full access on Session" ON "Session" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- MESSAGE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Only session participants can view messages in their session
CREATE POLICY "Participants can view messages" ON "Message" FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Session" s
      WHERE s.id = "Message"."sessionId"
        AND (
          s."studentId" = auth.uid()::text
          OR s."partnerId" = auth.uid()::text
        )
    )
  );
-- Admins have full access
CREATE POLICY "Admin full access on Message" ON "Message" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- REVIEW POLICIES
-- ─────────────���───────────────────────────────────────────────────────────────────────
-- Users can view reviews they gave or received
CREATE POLICY "Users view own reviews" ON "Review" FOR
SELECT USING (
    auth.uid()::text = "reviewerId"
    OR auth.uid()::text = "revieweeId"
  );
-- Admins have full access
CREATE POLICY "Admin full access on Review" ON "Review" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- DAILY CHALLENGE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view daily challenges
CREATE POLICY "Public can view challenges" ON "DailyChallenge" FOR
SELECT USING (true);
-- Admins have full access
CREATE POLICY "Admin full access on DailyChallenge" ON "DailyChallenge" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- DAILY CHALLENGE ATTEMPT POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Users can view their own challenge attempts
CREATE POLICY "Users can view own attempts" ON "DailyChallengeAttempt" FOR
SELECT USING (auth.uid()::text = "userId");
-- Users can submit their own challenge attempts
CREATE POLICY "Users can insert own attempts" ON "DailyChallengeAttempt" FOR
INSERT WITH CHECK (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on DailyChallengeAttempt" ON "DailyChallengeAttempt" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- STRUGGLE GROUP POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view struggle groups
CREATE POLICY "Users view struggle groups" ON "StruggleGroup" FOR
SELECT USING (true);
-- Admins have full access
CREATE POLICY "Admin full access on StruggleGroup" ON "StruggleGroup" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- TUTOR APPLICATION POLICIES (Post PR #2 fix)
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Users can view their own tutor application
CREATE POLICY "Users view own tutor applications" ON "TutorApplication" FOR
SELECT USING (auth.uid()::text = "userId");
-- Admins have full access (can see PENDING, APPROVED, REJECTED)
CREATE POLICY "Admin full access on TutorApplication" ON "TutorApplication" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- NOTIFICATION POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Users can view their own notifications
CREATE POLICY "Users view own notifications" ON "Notification" FOR
SELECT USING (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on Notification" ON "Notification" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- FEED POST POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view feed posts
CREATE POLICY "Public can view feed posts" ON "FeedPost" FOR
SELECT USING (true);
-- Admins have full access
CREATE POLICY "Admin full access on FeedPost" ON "FeedPost" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- POST LIKE POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Users can manage their own likes
CREATE POLICY "Users manage own likes" ON "PostLike" FOR ALL USING (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on PostLike" ON "PostLike" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- COMMENT POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Everyone can view comments
CREATE POLICY "Public can view comments" ON "Comment" FOR
SELECT USING (true);
-- Admins have full access
CREATE POLICY "Admin full access on Comment" ON "Comment" FOR ALL USING (is_admin());
-- ─────────────────────────────────────────────────────────────────────────────────────
-- ACHIEVEMENT POLICIES
-- ─────────────────────────────────────────────────────────────────────────────────────
-- Users can view their own achievements
CREATE POLICY "Users view own achievements" ON "Achievement" FOR
SELECT USING (auth.uid()::text = "userId");
-- Admins have full access
CREATE POLICY "Admin full access on Achievement" ON "Achievement" FOR ALL USING (is_admin());
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 6: CREATE PERFORMANCE INDEXES
-- ════════════════════════════════════════════════════════════════════════════════════
-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);
-- Session indexes
CREATE INDEX IF NOT EXISTS idx_session_student_id ON "Session"("studentId");
CREATE INDEX IF NOT EXISTS idx_session_partner_id ON "Session"("partnerId");
CREATE INDEX IF NOT EXISTS idx_session_status ON "Session"(status);
-- Message indexes
CREATE INDEX IF NOT EXISTS idx_message_session_id ON "Message"("sessionId");
CREATE INDEX IF NOT EXISTS idx_message_created_at ON "Message"("createdAt" DESC);
-- Tutor Application indexes (for admin dashboard queries)
CREATE INDEX IF NOT EXISTS idx_tutor_app_user_id ON "TutorApplication"("userId");
CREATE INDEX IF NOT EXISTS idx_tutor_app_status ON "TutorApplication"(status);
CREATE INDEX IF NOT EXISTS idx_tutor_app_pending ON "TutorApplication"(status)
WHERE status = 'PENDING';
-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS idx_notification_read ON "Notification"("read");
-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_achievement_user_id ON "Achievement"("userId");
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 7: PRODUCTION ENHANCEMENTS (Optional but recommended)
-- ════════════════════════════════════════════════════════════════════════════════════
-- Add subscription tracking columns to User if they don't exist
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (
    subscription_tier IN ('free', 'pro', 'institution')
  ),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daily_search_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_message_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_count_reset DATE DEFAULT CURRENT_DATE;
-- Create trigger to reset daily counts
CREATE OR REPLACE FUNCTION reset_daily_counts() RETURNS TRIGGER AS $$ BEGIN IF NEW.last_count_reset < CURRENT_DATE THEN NEW.daily_search_count = 0;
NEW.daily_message_count = 0;
NEW.last_count_reset = CURRENT_DATE;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_reset_daily_counts ON "User";
CREATE TRIGGER tr_reset_daily_counts BEFORE
UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION reset_daily_counts();
-- ════════════════════════════════════════════════════════════════════════════════════
-- STEP 8: VERIFICATION QUERIES (Run these to verify setup)
-- ════════════════════════════════════════════════════════════════════════════════════
-- Verify RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND rowsecurity = true
-- ORDER BY tablename;
-- Verify all policies are created
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- Verify is_admin() function exists
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname = 'is_admin';
-- ══════════════════════════════════════════════════════════════════��═════════════════
-- DONE! Your RLS is now production-ready and aligned with PR #2
-- ════════════════════════════════════════════════════════════════════════════════════