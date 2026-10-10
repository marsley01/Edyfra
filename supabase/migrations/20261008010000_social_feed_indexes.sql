-- Indexes for the social feed / profiles / forum keyset pagination.
-- Run AFTER 20261008000000_connections_follow.sql. All statements are
-- idempotent. On a large production table prefer running each statement as
-- CREATE INDEX CONCURRENTLY outside a transaction.

-- Feed: latest / following / for-you window, keyset on ("createdAt", id).
CREATE INDEX IF NOT EXISTS feedpost_created_id_idx
  ON public."FeedPost" ("createdAt" DESC, id DESC);

-- Profile posts grid + following tab (userId IN (...)) + post flood guard.
CREATE INDEX IF NOT EXISTS feedpost_user_created_idx
  ON public."FeedPost" ("userId", "createdAt" DESC, id DESC);

-- Popular tab: keyset on (likes, "createdAt", id).
CREATE INDEX IF NOT EXISTS feedpost_likes_created_idx
  ON public."FeedPost" (likes DESC, "createdAt" DESC, id DESC);

-- Subject filter / trending subjects.
CREATE INDEX IF NOT EXISTS feedpost_subject_created_idx
  ON public."FeedPost" (subject, "createdAt" DESC)
  WHERE subject IS NOT NULL;

-- Comment threads (newest page first) + _count(comments).
CREATE INDEX IF NOT EXISTS comment_post_created_idx
  ON public."Comment" ("postId", "createdAt" DESC, id DESC);

-- Comment flood guard.
CREATE INDEX IF NOT EXISTS comment_user_created_idx
  ON public."Comment" ("userId", "createdAt" DESC);

-- Followers / following lists, newest first, keyset on (created_at, id).
CREATE INDEX IF NOT EXISTS connections_following_created_idx
  ON public.connections (following_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS connections_follower_created_idx
  ON public.connections (follower_id, created_at DESC, id DESC);

-- Forum topic list: non-pinned page keyset on ("lastActivityAt", id).
CREATE INDEX IF NOT EXISTS communitytopic_pinned_activity_id_idx
  ON public."CommunityTopic" (pinned, "lastActivityAt" DESC, id DESC);

-- Forum search (title/body ILIKE '%q%').
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS communitytopic_title_trgm_idx
  ON public."CommunityTopic" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS communitytopic_body_trgm_idx
  ON public."CommunityTopic" USING gin (body gin_trgm_ops);
