-- ================================================================
-- Fix: Add missing billing_payment_events table + profile stripe columns
-- Required for Stripe webhook + subscription upgrade flow
-- Migration: 20260323_033_billing_stripe_fix.sql
-- ================================================================

-- 1. Add Stripe-related columns to profiles (if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_status') THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_status text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_current_period_end') THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_current_period_end timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_payment_at') THEN
    ALTER TABLE profiles ADD COLUMN last_payment_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan') THEN
    ALTER TABLE profiles ADD COLUMN plan text NOT NULL DEFAULT 'free';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'premium_until') THEN
    ALTER TABLE profiles ADD COLUMN premium_until timestamptz;
  END IF;
END $$;

-- Index for Stripe customer lookup (webhook uses this heavily)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 2. Create billing_payment_events table (used by Stripe webhook to log all events)
CREATE TABLE IF NOT EXISTS billing_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  mode text,                         -- subscription | payment
  payment_status text,
  amount_total bigint,               -- amount in cents
  currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint for idempotent webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_payment_events_stripe_event
  ON billing_payment_events(stripe_event_id);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_billing_payment_events_user
  ON billing_payment_events(user_id, created_at DESC);

-- RLS: users can see their own payment events
ALTER TABLE billing_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_payment_events_own" ON billing_payment_events
  FOR SELECT USING (user_id = auth.uid());

-- Service role (webhook) can insert/update via supabase admin client (bypasses RLS)
