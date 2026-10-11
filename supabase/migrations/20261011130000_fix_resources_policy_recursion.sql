-- Hotfix for 20261011120000_lock_down_rls.sql.
--
-- resources_purchased_read checked resource_purchases, whose SELECT policy
-- checks resources (seller can see purchases of their resource). Each policy
-- evaluated the other, so every authenticated read of resources failed with
-- 42P17 "infinite recursion detected in policy" and /api/resources returned 500.
--
-- The checks now go through SECURITY DEFINER functions, which read the other
-- table without re-entering its policies.

BEGIN;

CREATE OR REPLACE FUNCTION public.has_purchased_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM resource_purchases
    WHERE resource_id = p_resource_id AND user_id = auth.uid()::text
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM resources
    WHERE id = p_resource_id AND seller_id = auth.uid()::text
  );
$$;

DROP POLICY IF EXISTS resources_purchased_read ON public.resources;
CREATE POLICY resources_purchased_read ON public.resources FOR SELECT TO authenticated
  USING (has_purchased_resource(id));

DROP POLICY IF EXISTS "Purchaser and seller view resource purchases" ON public.resource_purchases;
CREATE POLICY resource_purchases_read ON public.resource_purchases FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid()::text OR owns_resource(resource_id));

COMMIT;
