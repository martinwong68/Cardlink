-- Migration: Add Stripe Connect columns to companies table
-- Purpose: Support Stripe Connect Express accounts for business users to receive payments

ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false;

-- Index for quick lookups by connected account ID
CREATE INDEX IF NOT EXISTS idx_companies_stripe_connect_account
  ON companies (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;
