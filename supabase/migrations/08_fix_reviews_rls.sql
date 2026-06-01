-- Reviews are outside Prisma's "Review" model, but their admin policies must
-- use the same source of truth: public."User".role.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  school TEXT DEFAULT 'Edyfra Scholar',
  quote TEXT NOT NULL CHECK (char_length(quote) >= 20 AND char_length(quote) <= 500),
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM "User" WHERE id = auth.uid()::text LIMIT 1;
  IF user_role = 'ADMIN' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Anyone can submit a review" ON reviews;
DROP POLICY IF EXISTS "Read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Admins read all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can approve or delete reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON reviews;

CREATE POLICY "Anyone can submit a review"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Read approved reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (approved = true OR is_admin());

CREATE POLICY "Admins can update reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved, created_at DESC);
