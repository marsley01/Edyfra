-- Migration: 09_newsletter_subscribers
-- Creates the newsletter_subscribers table with RLS policies

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        TEXT NOT NULL DEFAULT 'landing_page'
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
  ON newsletter_subscribers (email);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at
  ON newsletter_subscribers (subscribed_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous/unauthenticated) to insert their email
CREATE POLICY "newsletter_insert_anon"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the service role (admin) can read subscribers — no public select
-- (The service role bypasses RLS entirely, so no explicit policy needed for it)
-- Block any select from regular users and anon
CREATE POLICY "newsletter_select_deny_all"
  ON newsletter_subscribers
  FOR SELECT
  USING (false);

-- Block update and delete for all non-service-role users
CREATE POLICY "newsletter_no_update"
  ON newsletter_subscribers
  FOR UPDATE
  USING (false);

CREATE POLICY "newsletter_no_delete"
  ON newsletter_subscribers
  FOR DELETE
  USING (false);
