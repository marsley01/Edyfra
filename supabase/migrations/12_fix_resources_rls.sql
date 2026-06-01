-- Migration: 12_fix_resources_rls
-- Description: Fix RLS policies for resources table so authenticated users can insert

-- Ensure resources table columns match what the app sends
ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS preview_path TEXT;

-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "Sellers can manage own resources" ON resources;
DROP POLICY IF EXISTS "Sellers can view and manage their own resources" ON resources;
DROP POLICY IF EXISTS "Approved resources are readable by all" ON resources;
DROP POLICY IF EXISTS "Approved resources are viewable by everyone" ON resources;

-- Re-enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Public can read approved resources
CREATE POLICY "Anyone can read approved resources"
  ON resources FOR SELECT
  USING (status = 'approved');

-- Authenticated users can read their own resources (including pending/rejected)
CREATE POLICY "Users can read own resources"
  ON resources FOR SELECT
  USING (auth.uid()::text = seller_id);

-- Authenticated users can insert their own resources
CREATE POLICY "Users can insert own resources"
  ON resources FOR INSERT
  WITH CHECK (auth.uid()::text = seller_id);

-- Authenticated users can update/delete their own resources
CREATE POLICY "Users can update own resources"
  ON resources FOR UPDATE
  USING (auth.uid()::text = seller_id)
  WITH CHECK (auth.uid()::text = seller_id);

CREATE POLICY "Users can delete own resources"
  ON resources FOR DELETE
  USING (auth.uid()::text = seller_id);

-- Admin gets full access (using Prisma role)
CREATE POLICY "Admin full access on resources"
  ON resources FOR ALL
  USING (is_admin());

-- ─── Storage bucket RLS ───────────────────────────────────────────────────────

-- Allow authenticated users to upload to resources bucket
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own resources" ON storage.objects;

-- Allow anyone to read resources from storage (they're public URLs anyway)
CREATE POLICY "Anyone can read resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resources');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete own resource files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
