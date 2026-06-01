-- Keep database authorization aligned with the app: Prisma User.role is the source of truth.
-- Supabase raw_user_meta_data is user-editable and must not grant admin access.
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
