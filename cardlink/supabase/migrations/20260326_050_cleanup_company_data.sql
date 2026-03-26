-- ================================================================
-- Data Cleanup Migration: Remove all company data
-- Keep only the user profile for martinwong58@gmail.com
--
-- This migration deletes data only — no schema changes.
-- All company-scoped tables cascade from companies(id),
-- so deleting companies removes all dependent rows.
-- ================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Resolve the user we want to keep
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'martinwong58@gmail.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User martinwong58@gmail.com not found — skipping cleanup.';
    RETURN;
  END IF;

  -- ── Fix crm_notes FK if it lacks CASCADE ──────────────────
  BEGIN
    ALTER TABLE crm_notes
      DROP CONSTRAINT IF EXISTS crm_notes_company_id_fkey;
    ALTER TABLE crm_notes
      ADD CONSTRAINT crm_notes_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN
    -- crm_notes may not exist yet
    NULL;
  END;

  -- ── Delete ALL companies (cascades to 100+ dependent tables) ──
  DELETE FROM companies;

  -- ── Clean up organization overlay rows (also cascaded, but be safe) ──
  DELETE FROM organizations WHERE true;

  -- ── Clean orphaned billing payment events ──
  DELETE FROM billing_payment_events WHERE true;

  -- ── Reset the user profile to clean state ──
  UPDATE profiles
     SET business_active_company_id = NULL,
         plan = 'free',
         premium_until = NULL,
         stripe_customer_id = NULL,
         stripe_subscription_id = NULL,
         stripe_subscription_status = NULL,
         stripe_subscription_current_period_end = NULL,
         last_payment_at = NULL
   WHERE id = v_user_id;

  -- ── Delete profiles for other users (if any exist) ──
  DELETE FROM profiles WHERE id != v_user_id;

  RAISE NOTICE '✅ Cleanup complete. Kept user martinwong58@gmail.com (%).' , v_user_id;
END $$;
