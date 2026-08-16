-- Migration: news thumbnail cache table
-- Stores resolved thumbnail data for RSS articles to avoid re-fetching on every request.

CREATE TABLE IF NOT EXISTS news_thumbnails (
  article_url        TEXT PRIMARY KEY,
  thumbnail_url      TEXT,
  thumbnail_source   TEXT CHECK (thumbnail_source IN ('og', 'pexels') OR thumbnail_source IS NULL),
  pexels_photographer TEXT,
  pexels_photo_page  TEXT,
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for age-based cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_news_thumbnails_fetched_at
  ON news_thumbnails (fetched_at);

-- Public read access (no auth required — this is cached metadata, not PII)
ALTER TABLE news_thumbnails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_read_news_thumbnails"
  ON news_thumbnails FOR SELECT
  USING (true);

-- Only service role can write (server-side only)
CREATE POLICY "allow_service_write_news_thumbnails"
  ON news_thumbnails FOR INSERT
  WITH CHECK (true);

CREATE POLICY "allow_service_update_news_thumbnails"
  ON news_thumbnails FOR UPDATE
  USING (true);
