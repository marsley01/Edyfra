-- Migration: API Gateway setup
-- Creates tables required to store API keys, usage logs, and received webhooks.

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  app_name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  rate_limit_per_hour integer DEFAULT 200,
  monthly_call_limit integer DEFAULT 20000,
  calls_this_month integer DEFAULT 0,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  rotating_from text,
  rotation_grace_until timestamptz
);

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  ip_address text,
  app_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_webhooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  received_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_id ON api_usage_logs (api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs (created_at);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;

-- Only service_role can access or modify api_keys
CREATE POLICY "allow_service_role_all_keys" ON api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- api_usage_logs are insert-only from service_role, plus select for admin dashboard
CREATE POLICY "allow_service_role_insert_logs" ON api_usage_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "allow_service_role_select_logs" ON api_usage_logs
  FOR SELECT TO service_role USING (true);

-- api_webhooks are managed by service_role
CREATE POLICY "allow_service_role_all_webhooks" ON api_webhooks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
