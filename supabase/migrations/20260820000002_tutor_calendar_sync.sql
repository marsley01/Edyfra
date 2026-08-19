-- Tutor calendar sync — blocks imported from Google Calendar iCal feeds.

-- ---------------------------------------------------------------------------
-- 1. tutor_availability_blocks
-- One row per blocked time window for a tutor. Rows are created either from
-- an imported Google Calendar (source = 'google_calendar') or manually
-- (source = 'manual'). Upserts use the (tutor_id, external_uid) unique pair so
-- re-syncing a calendar never duplicates blocks.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tutor_availability_blocks (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'google_calendar')),
    external_uid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tutor_availability_blocks_tutor_uid_key
    ON public.tutor_availability_blocks (tutor_id, external_uid);

CREATE INDEX IF NOT EXISTS idx_tutor_availability_blocks_tutor_start
    ON public.tutor_availability_blocks (tutor_id, start_at);

CREATE INDEX IF NOT EXISTS idx_tutor_availability_blocks_tutor_time
    ON public.tutor_availability_blocks (tutor_id, start_at, end_at);

ALTER TABLE public.tutor_availability_blocks ENABLE ROW LEVEL SECURITY;

-- Tutors can manage their own blocks (insert/update/delete via the API layer).
DROP POLICY IF EXISTS "Tutors can manage their own blocks"
    ON public.tutor_availability_blocks;
CREATE POLICY "Tutors can manage their own blocks"
    ON public.tutor_availability_blocks FOR ALL
    USING (auth.uid()::text = tutor_id);

-- Anyone (including students) can view blocks so the booking UI can hide
-- occupied slots. Mirrors the existing tutor_availability policy.
DROP POLICY IF EXISTS "Public can view tutor blocks"
    ON public.tutor_availability_blocks;
CREATE POLICY "Public can view tutor blocks"
    ON public.tutor_availability_blocks FOR SELECT
    USING (true);

-- ---------------------------------------------------------------------------
-- 2. tutor_calendar_settings
-- Per-tutor iCal URL + auto-sync preference + last sync timestamp.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tutor_calendar_settings (
    tutor_id TEXT PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
    ical_url TEXT,
    auto_sync BOOLEAN NOT NULL DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tutor_calendar_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can manage their own calendar settings"
    ON public.tutor_calendar_settings;
CREATE POLICY "Tutors can manage their own calendar settings"
    ON public.tutor_calendar_settings FOR ALL
    USING (auth.uid()::text = tutor_id);

-- ---------------------------------------------------------------------------
-- 3. Auto-sync every 6 hours via pg_cron.
-- The cron job calls the Supabase Edge Function `sync-tutor-calendars`, which
-- re-imports every calendar whose tutor has auto_sync enabled.
--
-- Setup (one-time, per project):
--   SELECT set_config('app_settings.supabase_functions_url',
--     'https://<PROJECT_REF>.supabase.co/functions/v1/sync-tutor-calendars', false);
--   SELECT set_config('app_settings.cron_secret', '<a-long-random-string>', false);
-- The edge function rejects calls unless the `Authorization: Bearer <cron_secret>`
-- header matches, so the job fails safe until these are configured.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
    functions_url text := current_setting('app_settings.supabase_functions_url', true);
BEGIN
    IF functions_url IS NULL OR functions_url = '' THEN
        RAISE NOTICE 'app_settings.supabase_functions_url not set; skipping cron schedule';
        RETURN;
    END IF;

    PERFORM cron.unschedule('sync-tutor-calendars');
    PERFORM cron.schedule('sync-tutor-calendars', '0 */6 * * *', format(
        'SELECT net.http_post(
            url := %L,
            headers := jsonb_build_object(
                ''Content-Type'', ''application/json'',
                ''Authorization'', ''Bearer '' || current_setting(''app_settings.cron_secret'', true)
            ),
            body := ''{}''
        ) AS request_id;',
        functions_url
    ));
END $$;