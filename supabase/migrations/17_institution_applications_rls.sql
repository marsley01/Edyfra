-- Migration: 17_institution_applications_rls.sql
-- Description: RLS policies for institution_applications table

BEGIN;

ALTER TABLE institution_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_submit_institution_application" ON institution_applications;
DROP POLICY IF EXISTS "admin_can_read_institution_applications" ON institution_applications;
DROP POLICY IF EXISTS "admin_can_update_institution_applications" ON institution_applications;

-- 1. Anonymous users (and logged-in users) can INSERT a new application inquiry
CREATE POLICY "anon_can_submit_institution_application" ON institution_applications
  FOR INSERT WITH CHECK (true);

-- 2. Only platform admins can SELECT institution applications
CREATE POLICY "admin_can_read_institution_applications" ON institution_applications
  FOR SELECT USING (is_admin());

-- 3. Only platform admins can UPDATE institution applications (e.g. approve/reject)
CREATE POLICY "admin_can_update_institution_applications" ON institution_applications
  FOR UPDATE USING (is_admin());

COMMIT;
