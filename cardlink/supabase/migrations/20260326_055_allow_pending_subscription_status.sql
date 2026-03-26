-- Allow "pending" status in company_subscriptions
-- The register-company API creates subscriptions with status "pending" until
-- Stripe payment is confirmed, but the original CHECK constraint only allowed
-- ('active', 'cancelled', 'past_due', 'trialing').

ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_status_check;
ALTER TABLE company_subscriptions ADD CONSTRAINT company_subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'pending'));
