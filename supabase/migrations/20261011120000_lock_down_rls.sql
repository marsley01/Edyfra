-- Lock down row-level security to least privilege.
--
-- Found 2026-10-11: a policy named `authenticated_all` (FOR ALL TO authenticated
-- USING (true) WITH CHECK (true)) sat on 64 public tables, and several others
-- were nearly as open ("User" readable by everyone and editable by its owner,
-- TutorProfile readable with KYC links and owner-editable isVerified, users able
-- to insert their own payments / purchases). Anyone with the public anon key and
-- a free account could read every user's email, make themselves ADMIN, approve
-- their own tutor application or grant themselves paid resources.
--
-- The app reads and writes through Prisma (table owner) and the service-role
-- client, both of which bypass RLS, so they are unaffected. Only the handful of
-- browser / user-session queries listed below need policies, and each gets the
-- narrowest one that works.
--
-- Rollback: supabase/rollbacks/20261011120000_restore_rls_policies.sql

BEGIN;

-- Tutors may watch open match requests (tutor dashboard realtime feed).
CREATE OR REPLACE FUNCTION public.is_tutor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role = 'TUTOR');
$$;

-- 1. Every table that user-session code never touches: admin-only.
DO $$
DECLARE
  t record;
  p record;
  keep text[] := ARRAY[
    -- tables queried with the user's session (see the policies below)
    'resources', 'resource_purchases', 'MatchRequest', 'notifications', 'push_subscriptions', 'bookings',
    -- shared reference data / caches / key-authenticated public API
    'curriculum_topics', 'news_thumbnails', 'plans', 'api_keys', 'api_usage_logs', 'api_webhooks',
    'profiles', 'study_rooms', 'newsletter_subscribers', 'institution_applications'
  ];
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT (c.relname = ANY (keep))
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t.relname LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t.relname);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    EXECUTE format(
      'CREATE POLICY admin_all ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
      t.relname
    );
  END LOOP;
END $$;

-- 2. resources: public listing, sellers' own rows, buyers' purchased rows.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resources' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.resources', p.policyname);
  END LOOP;
END $$;
CREATE POLICY resources_public_read ON public.resources FOR SELECT TO anon, authenticated
  USING (status = 'approved');
CREATE POLICY resources_own_read ON public.resources FOR SELECT TO authenticated
  USING (seller_id = auth.uid()::text);
CREATE POLICY resources_purchased_read ON public.resources FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.resource_purchases rp WHERE rp.resource_id = resources.id AND rp.user_id = auth.uid()::text));
CREATE POLICY resources_insert_own ON public.resources FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid()::text AND status = 'pending' AND coalesce(price, 0) >= 0);
CREATE POLICY admin_all ON public.resources FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- The storage path is never exposed to browser sessions; downloads go through
-- getResourceDownloadUrl (login + purchase check + 5-minute signed URL).
REVOKE SELECT ON public.resources FROM anon, authenticated;
GRANT SELECT (id, seller_id, title, subject, education_level, resource_type, topic, description,
              price, downloads, rating, status, created_at)
  ON public.resources TO anon, authenticated;

-- 3. resource_purchases: created only by the server after M-Pesa confirms
--    payment. Letting users insert their own row unlocked any paid file.
DROP POLICY IF EXISTS "Purchasers insert own resource purchases" ON public.resource_purchases;

-- 4. MatchRequest: students see their own; tutors see open requests.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MatchRequest' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public."MatchRequest"', p.policyname);
  END LOOP;
END $$;
CREATE POLICY match_request_own_read ON public."MatchRequest" FOR SELECT TO authenticated
  USING ("studentId" = auth.uid()::text);
CREATE POLICY match_request_tutor_read ON public."MatchRequest" FOR SELECT TO authenticated
  USING ("sessionId" IS NULL AND is_tutor());
CREATE POLICY admin_all ON public."MatchRequest" FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 5. bookings: browsers only need to read their own (realtime); bookings are
--    created and changed by the server.
DROP POLICY IF EXISTS bookings_insert ON public.bookings;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookings' AND cmd IN ('INSERT', 'UPDATE', 'DELETE') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', p.policyname);
  END LOOP;
END $$;

-- 6. newsletter_subscribers: anyone could rewrite any subscriber row.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers' AND cmd = 'UPDATE' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.newsletter_subscribers', p.policyname);
  END LOOP;
END $$;

-- 7. Kept tables: remove the blanket policy if it is there. Skips tables that
--    don't exist in this database (DROP POLICY ... ON a missing table errors
--    even with IF EXISTS).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notifications', 'push_subscriptions', 'newsletter_subscribers', 'plans'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
