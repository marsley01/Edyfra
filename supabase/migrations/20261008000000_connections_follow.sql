-- Follow graph used by src/app/actions/social.ts and profile.ts.
-- The code has always read and written `public.connections`, but no migration
-- ever created it, so every follow failed and every profile showed 0 followers.

CREATE TABLE IF NOT EXISTS public.connections (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   text        NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  following_id  text        NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_no_self_follow CHECK (follower_id <> following_id),
  CONSTRAINT connections_unique_pair UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS connections_following_idx ON public.connections (following_id);

-- Only the service role (server actions) touches this table.
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
