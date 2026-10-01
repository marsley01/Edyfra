-- Creates a trigger on auth.users to auto-provision a public."User" row for new accounts
-- This covers OAuth (Google) sign-ins where the app code may run in different contexts.
-- SECURITY DEFINER is required for a trigger on auth.users to insert into public tables.
-- search_path is explicitly set to public for safety.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name TEXT;
  avatar_url TEXT;
BEGIN
  -- Prefer full_name from metadata, fallback to name, then empty string
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );

  -- Prefer avatar_url from metadata, fallback to picture
  avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public."User" (id, email, name, avatar, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(full_name, ''),
    avatar_url,
    'STUDENT'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
