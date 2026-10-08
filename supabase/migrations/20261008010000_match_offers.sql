-- Tutor offers for instant matching (src/app/actions/match-engine.ts).
--
-- A MatchRequest is offered to one ranked tutor at a time. The offer is
-- exclusive until expires_at; on decline/timeout the next tutor is offered.
-- The partial unique index guarantees at most ONE pending offer per request,
-- so two concurrent pollers can never offer the same request twice.
--
-- Accessed only through the service-role admin client. Until this migration
-- is applied the app falls back to the old open feed (any tutor may accept).

CREATE TABLE IF NOT EXISTS public.match_offers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id  text        NOT NULL REFERENCES public."MatchRequest"(id) ON DELETE CASCADE,
  tutor_id          text        NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  status            text        NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')),
  score             double precision,
  offered_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  responded_at      timestamptz,
  CONSTRAINT match_offers_request_tutor_unique UNIQUE (match_request_id, tutor_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS match_offers_one_pending_per_request
  ON public.match_offers (match_request_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS match_offers_tutor_idx
  ON public.match_offers (tutor_id, offered_at DESC);

ALTER TABLE public.match_offers ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (server actions) reads or writes offers.
