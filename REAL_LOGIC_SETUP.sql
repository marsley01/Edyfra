-- ═══════════════════════════════════════════
-- 🛡️ EDYFRA: PRODUCTION LOGIC SETUP (V2)
-- ═══════════════════════════════════════════

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Subscription & Limit Tracking
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'pro', 'institution')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daily_search_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_message_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_count_reset DATE DEFAULT CURRENT_DATE;

-- 3. Social & Connection Infrastructure
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  following_id TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  profile_id TEXT REFERENCES "User"(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Dynamic News Repository
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  source TEXT,
  url TEXT UNIQUE NOT NULL,
  image_url TEXT,
  excerpt TEXT,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  author TEXT DEFAULT 'Edyfra Intelligence',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);

-- 5. Fuzzy Search Engine (RPC)
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  role TEXT,
  school TEXT,
  bio TEXT,
  avatar TEXT,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.name, u.role::TEXT, u.county as school, u.bio, u.avatar,
    GREATEST(
      similarity(u.name, search_term),
      similarity(u.county, search_term)
    ) AS sim
  FROM "User" u
  WHERE 
    u.name ILIKE '%' || search_term || '%'
    OR u.county ILIKE '%' || search_term || '%'
    OR u.bio ILIKE '%' || search_term || '%'
    OR similarity(u.name, search_term) > 0.1
  ORDER BY sim DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_county_trgm ON "User" USING gin (county gin_trgm_ops);

-- 6. Trigger to reset daily counts
CREATE OR REPLACE FUNCTION reset_daily_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_count_reset < CURRENT_DATE THEN
    NEW.daily_search_count = 0;
    NEW.daily_message_count = 0;
    NEW.last_count_reset = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reset_daily_counts
BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION reset_daily_counts();
