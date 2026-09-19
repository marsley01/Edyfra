-- Migration: 18_scope_authenticated_all_policies.sql
-- Description: Replace unscoped authenticated_all (USING true / WITH CHECK true) policies with strict owner/tenancy policies across 7 core tables.

BEGIN;

-- ─── 1. Institution ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON "Institution";
DROP POLICY IF EXISTS "Members and admins can view institution" ON "Institution";
DROP POLICY IF EXISTS "Institution admins can update institution" ON "Institution";
DROP POLICY IF EXISTS "Admins can manage institution" ON "Institution";

CREATE POLICY "Members and admins can view institution" ON "Institution"
  FOR SELECT USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" im
      WHERE im."institutionId" = "Institution".id
        AND im."userId" = auth.uid()::text
        AND im.status = 'ACTIVE'
    )
  );

CREATE POLICY "Institution admins can update institution" ON "Institution"
  FOR UPDATE USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" im
      WHERE im."institutionId" = "Institution".id
        AND im."userId" = auth.uid()::text
        AND im.role IN ('INSTITUTION_ADMIN', 'ADMIN', 'OWNER')
        AND im.status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins can manage institution" ON "Institution"
  FOR ALL USING (is_admin());

-- ─── 2. InstitutionMember ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON "InstitutionMember";
DROP POLICY IF EXISTS "Members view co-members and self view own membership" ON "InstitutionMember";
DROP POLICY IF EXISTS "Institution admins manage members" ON "InstitutionMember";

CREATE POLICY "Members view co-members and self view own membership" ON "InstitutionMember"
  FOR SELECT USING (
    is_admin() OR
    "userId" = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" self
      WHERE self."institutionId" = "InstitutionMember"."institutionId"
        AND self."userId" = auth.uid()::text
        AND self.status = 'ACTIVE'
    )
  );

CREATE POLICY "Institution admins manage members" ON "InstitutionMember"
  FOR ALL USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" self
      WHERE self."institutionId" = "InstitutionMember"."institutionId"
        AND self."userId" = auth.uid()::text
        AND self.role IN ('INSTITUTION_ADMIN', 'ADMIN', 'OWNER')
        AND self.status = 'ACTIVE'
    )
  );

-- ─── 3. InstitutionStudent ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON "InstitutionStudent";
DROP POLICY IF EXISTS "Students and staff view institution students" ON "InstitutionStudent";
DROP POLICY IF EXISTS "Institution staff manage institution students" ON "InstitutionStudent";

CREATE POLICY "Students and staff view institution students" ON "InstitutionStudent"
  FOR SELECT USING (
    is_admin() OR
    "userId" = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" im
      WHERE im."institutionId" = "InstitutionStudent"."institutionId"
        AND im."userId" = auth.uid()::text
        AND im.status = 'ACTIVE'
    )
  );

CREATE POLICY "Institution staff manage institution students" ON "InstitutionStudent"
  FOR ALL USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM "InstitutionMember" im
      WHERE im."institutionId" = "InstitutionStudent"."institutionId"
        AND im."userId" = auth.uid()::text
        AND im.role IN ('INSTITUTION_ADMIN', 'ADMIN', 'STAFF', 'OWNER')
        AND im.status = 'ACTIVE'
    )
  );

-- ─── 4. bookings ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON bookings;
DROP POLICY IF EXISTS "Parties and institution staff view bookings" ON bookings;
DROP POLICY IF EXISTS "Students insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Parties update own bookings" ON bookings;

CREATE POLICY "Parties and institution staff view bookings" ON bookings
  FOR SELECT USING (
    is_admin() OR
    auth.uid()::text = student_id OR
    auth.uid()::text = tutor_id OR
    EXISTS (
      SELECT 1 FROM "InstitutionStudent" ist
      JOIN "InstitutionMember" im ON im."institutionId" = ist."institutionId"
      WHERE ist."userId" = bookings.student_id
        AND im."userId" = auth.uid()::text
        AND im.status = 'ACTIVE'
    )
  );

CREATE POLICY "Students insert own bookings" ON bookings
  FOR INSERT WITH CHECK (
    is_admin() OR
    auth.uid()::text = student_id
  );

CREATE POLICY "Parties update own bookings" ON bookings
  FOR UPDATE USING (
    is_admin() OR
    auth.uid()::text = student_id OR
    auth.uid()::text = tutor_id
  );

-- ─── 5. payments ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON payments;
DROP POLICY IF EXISTS "Users view own payments" ON payments;
DROP POLICY IF EXISTS "Users insert own payments" ON payments;
DROP POLICY IF EXISTS "Admins manage payments" ON payments;

CREATE POLICY "Users view own payments" ON payments
  FOR SELECT USING (
    is_admin() OR
    auth.uid()::text = user_id
  );

CREATE POLICY "Users insert own payments" ON payments
  FOR INSERT WITH CHECK (
    is_admin() OR
    auth.uid()::text = user_id
  );

CREATE POLICY "Admins manage payments" ON payments
  FOR ALL USING (is_admin());

-- ─── 6. resource_purchases ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON resource_purchases;
DROP POLICY IF EXISTS "Purchaser and seller view resource purchases" ON resource_purchases;
DROP POLICY IF EXISTS "Purchasers insert own resource purchases" ON resource_purchases;
DROP POLICY IF EXISTS "Admins manage resource purchases" ON resource_purchases;

CREATE POLICY "Purchaser and seller view resource purchases" ON resource_purchases
  FOR SELECT USING (
    is_admin() OR
    auth.uid()::text = user_id OR
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_purchases.resource_id
        AND r.seller_id = auth.uid()::text
    )
  );

CREATE POLICY "Purchasers insert own resource purchases" ON resource_purchases
  FOR INSERT WITH CHECK (
    is_admin() OR
    auth.uid()::text = user_id
  );

CREATE POLICY "Admins manage resource purchases" ON resource_purchases
  FOR ALL USING (is_admin());

-- ─── 7. session_payments ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all" ON session_payments;
DROP POLICY IF EXISTS "Student and tutor view session payments" ON session_payments;
DROP POLICY IF EXISTS "Admins manage session payments" ON session_payments;

CREATE POLICY "Student and tutor view session payments" ON session_payments
  FOR SELECT USING (
    is_admin() OR
    auth.uid()::text = student_id OR
    auth.uid()::text = tutor_id
  );

CREATE POLICY "Admins manage session payments" ON session_payments
  FOR ALL USING (is_admin());

COMMIT;
