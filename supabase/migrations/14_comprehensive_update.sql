-- ============================================
-- EDYFRA COMPREHENSIVE UPDATE MIGRATION
-- Tutor load balancing, referrals, mash context, analytics
-- ============================================

-- 1. TUTOR PROFILE NEW COLUMNS
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "current_active_sessions" INTEGER DEFAULT 0;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "max_concurrent_sessions" INTEGER DEFAULT 3;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "last_assigned_at" TIMESTAMP;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "total_assignments_today" INTEGER DEFAULT 0;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "response_rate" DECIMAL DEFAULT 100;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "sessions_assigned" INTEGER DEFAULT 0;
ALTER TABLE "TutorProfile" ADD COLUMN IF NOT EXISTS "sessions_responded" INTEGER DEFAULT 0;

-- 2. USER/PROFILE NEW COLUMNS
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referral_code" VARCHAR(6) UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referred_by" UUID REFERENCES "User"(id);

-- 3. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS "referrals" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  code_used VARCHAR(6) NOT NULL,
  bonus_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- 4. MASH CONTEXT TABLE
CREATE TABLE IF NOT EXISTS "mash_context" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  subjects_struggled TEXT[] DEFAULT '{}',
  topics_covered TEXT[] DEFAULT '{}',
  last_session_summary TEXT,
  weak_areas JSONB DEFAULT '{}',
  strong_areas JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT now()
);

-- 5. ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS "analytics_events" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON "analytics_events"(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON "analytics_events"(created_at);

-- 6. RLS POLICIES
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mash_context" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;

-- Referrals: users can see their own referrals
CREATE POLICY "Users can view own referrals"
  ON "referrals" FOR SELECT
  USING (referrer_id = auth::uuid() OR referred_id = auth::uuid());

-- Mash context: users can read/update their own
CREATE POLICY "Users can manage own mash context"
  ON "mash_context" FOR ALL
  USING (user_id = auth::uuid())
  WITH CHECK (user_id = auth::uuid());

-- Analytics: insert only for all authenticated, select for admins
CREATE POLICY "Authenticated can insert events"
  ON "analytics_events" FOR INSERT
  WITH CHECK (auth::uuid() IS NOT NULL);

CREATE POLICY "Admins can view analytics"
  ON "analytics_events" FOR SELECT
  USING (auth::uuid() IN (SELECT id FROM "User" WHERE role = 'ADMIN'));
