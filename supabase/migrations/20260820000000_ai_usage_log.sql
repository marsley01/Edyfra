-- AI usage log for Gemini rate limiting (per-user + daily global budget).
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  model text NOT NULL,
  tokens_used integer,
  feature text
);

CREATE INDEX IF NOT EXISTS ai_usage_log_user_idx ON public.ai_usage_log (user_id);
CREATE INDEX IF NOT EXISTS ai_usage_log_timestamp_idx ON public.ai_usage_log (timestamp);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role / server-side writes bypass RLS; these policies keep the
-- table safe for any future authenticated read/write.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_log' AND policyname = 'ai_usage_log_insert_own'
  ) THEN
    CREATE POLICY ai_usage_log_insert_own ON public.ai_usage_log
      FOR INSERT TO authenticated
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_log' AND policyname = 'ai_usage_log_select_own'
  ) THEN
    CREATE POLICY ai_usage_log_select_own ON public.ai_usage_log
      FOR SELECT TO authenticated
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;