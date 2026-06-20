-- ========================================
-- EDIYFRA FEATURE FLAGS
-- ========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (name, enabled, description) VALUES
  ('new_matching_algo', false, 'New group matching algorithm'),
  ('institution_portal', false, 'Institution dashboard'),
  ('holiday_coaching', false, 'Holiday coaching system'),
  ('ai_chat_v2', false, 'Next-gen AI chat interface'),
  ('paystack_payments', false, 'Paystack payment integration'),
  ('mpesa_payments', false, 'M-Pesa payment integration'),
  ('community_forum', true, 'Community forum features'),
  ('push_notifications', true, 'Web push notifications')
ON CONFLICT (name) DO NOTHING;
