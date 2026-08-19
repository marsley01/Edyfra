CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
    endpoint_url text NOT NULL,
    events text[] NOT NULL,
    secret text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    last_fired_at timestamp with time zone
);
