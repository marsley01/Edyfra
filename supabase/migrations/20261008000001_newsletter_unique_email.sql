-- Optional hardening: one row per subscriber email.
-- /api/newsletter already de-duplicates in code; this makes it race-proof.
-- Removes any duplicate rows (keeping the earliest) before adding the index.

DELETE FROM public.newsletter_subscribers a
USING public.newsletter_subscribers b
WHERE lower(a.email) = lower(b.email)
  AND (a.subscribed_at, a.id::text) > (b.subscribed_at, b.id::text);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_lower_key
  ON public.newsletter_subscribers (lower(email));
