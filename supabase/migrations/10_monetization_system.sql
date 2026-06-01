-- Migration: 10_monetization_system
-- Description: Complete payment and monetization infrastructure

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
-- Ensure UUID and other needed extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM ('subscription', 'session', 'resource');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE resource_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── TABLES ───────────────────────────────────────────────────────────────────

-- Plans Configuration Table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'free', 'plus'
    monthly_price INTEGER NOT NULL,
    yearly_price INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main Payments Log
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    phone TEXT NOT NULL,
    mpesa_receipt_number TEXT UNIQUE,
    checkout_request_id TEXT UNIQUE,
    plan_type TEXT, -- 'free', 'plus' (if subscription)
    payment_type payment_type NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor Session Specific Payments
CREATE TABLE IF NOT EXISTS session_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    tutor_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    gross_amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    tutor_payout INTEGER NOT NULL,
    mpesa_receipt TEXT UNIQUE,
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor Payout Requests
CREATE TABLE IF NOT EXISTS tutor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    phone TEXT NOT NULL,
    mpesa_receipt TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    status payment_status NOT NULL DEFAULT 'pending'
);

-- Resource Marketplace
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    education_level TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- KES 50-500
    file_path TEXT NOT NULL,
    downloads INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0,
    status resource_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Purchases Log
CREATE TABLE IF NOT EXISTS resource_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    seller_payout INTEGER NOT NULL,
    mpesa_receipt TEXT UNIQUE,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ALTER EXISTING TABLES ───────────────────────────────────────────────────

-- Add subscription fields to User
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_billing_cycle TEXT;

-- Add session rates to TutorProfile
ALTER TABLE "TutorProfile"
ADD COLUMN IF NOT EXISTS session_rate_1on1 INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS session_rate_group INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS payout_phone TEXT;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_purchases ENABLE ROW LEVEL SECURITY;

-- Plans: Public read, Admin write
CREATE POLICY "Plans are readable by all" ON plans FOR SELECT USING (true);

-- Payments: Users read own, Admin all
CREATE POLICY "Users can read own payments" ON payments 
FOR SELECT USING (auth.uid()::text = user_id);

-- Session Payments: Student/Tutor read own, Admin all
CREATE POLICY "Users can read own session payments" ON session_payments 
FOR SELECT USING (auth.uid()::text = student_id OR auth.uid()::text = tutor_id);

-- Tutor Payouts: Tutor read own, Admin all
CREATE POLICY "Tutors can read own payouts" ON tutor_payouts 
FOR SELECT USING (auth.uid()::text = tutor_id);

-- Resources: Public read approved, Seller all, Admin all
CREATE POLICY "Approved resources are readable by all" ON resources 
FOR SELECT USING (status = 'approved');
CREATE POLICY "Sellers can manage own resources" ON resources 
FOR ALL USING (auth.uid()::text = seller_id);

-- Resource Purchases: Buyer read own
CREATE POLICY "Users can read own resource purchases" ON resource_purchases 
FOR SELECT USING (auth.uid()::text = user_id);

-- ─── SEED DATA ───────────────────────────────────────────────────────────────

INSERT INTO plans (name, monthly_price, yearly_price, features)
VALUES 
('free', 0, 0, '{
    "mash_ai_daily": 10,
    "peer_matching": "standard",
    "tutor_access": false,
    "daily_challenges": 1,
    "history_limit": 3,
    "themes": ["default"]
}'),
('plus', 299, 2499, '{
    "mash_ai_daily": -1,
    "peer_matching": "priority",
    "tutor_access": true,
    "daily_challenges": -1,
    "history_limit": -1,
    "themes": "all",
    "ad_free": true,
    "plus_badge": true
}')
ON CONFLICT (name) DO UPDATE SET 
monthly_price = EXCLUDED.monthly_price,
yearly_price = EXCLUDED.yearly_price,
features = EXCLUDED.features;
