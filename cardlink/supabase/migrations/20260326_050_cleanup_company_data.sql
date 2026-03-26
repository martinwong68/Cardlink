-- ================================================================
-- Data Cleanup Migration: Remove all company, user, and community data
-- Keep only the user profile for martinwong58@gmail.com
--
-- This migration deletes data only — no schema changes.
-- Separated into three phases to respect FK ordering:
--   Phase 1: Company data (cascade from companies)
--   Phase 2: User data (namecard, card_shares, profiles)
--   Phase 3: Community data (boards, posts, connections)
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

  -- ════════════════════════════════════════════════════════════
  -- PHASE 1: Clean up ALL company data
  -- ════════════════════════════════════════════════════════════

  -- Fix crm_notes FK if it lacks CASCADE
  BEGIN
    ALTER TABLE crm_notes
      DROP CONSTRAINT IF EXISTS crm_notes_company_id_fkey;
    ALTER TABLE crm_notes
      ADD CONSTRAINT crm_notes_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Fix transaction_lines.account_id FK to CASCADE
  BEGIN
    ALTER TABLE transaction_lines
      DROP CONSTRAINT IF EXISTS transaction_lines_account_id_fkey;
    ALTER TABLE transaction_lines
      ADD CONSTRAINT transaction_lines_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Fix acct_bank_accounts.account_id FK to CASCADE
  BEGIN
    ALTER TABLE acct_bank_accounts
      DROP CONSTRAINT IF EXISTS acct_bank_accounts_account_id_fkey;
    ALTER TABLE acct_bank_accounts
      ADD CONSTRAINT acct_bank_accounts_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Fix inventory_items.account_id FK to CASCADE (referenced by accounts)
  BEGIN
    ALTER TABLE inventory_items
      DROP CONSTRAINT IF EXISTS inventory_items_account_id_fkey;
    ALTER TABLE inventory_items
      ADD CONSTRAINT inventory_items_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Fix vendor_bill_items.account_id FK to CASCADE
  BEGIN
    ALTER TABLE vendor_bill_items
      DROP CONSTRAINT IF EXISTS vendor_bill_items_account_id_fkey;
    ALTER TABLE vendor_bill_items
      ADD CONSTRAINT vendor_bill_items_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Fix bank_accounts.ledger_account_id FK to CASCADE
  BEGIN
    ALTER TABLE bank_accounts
      DROP CONSTRAINT IF EXISTS bank_accounts_ledger_account_id_fkey;
    ALTER TABLE bank_accounts
      ADD CONSTRAINT bank_accounts_ledger_account_id_fkey
      FOREIGN KEY (ledger_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete ALL companies (cascades to 100+ dependent tables)
  DELETE FROM companies;

  -- Clean up organization overlay rows (also cascaded, but be safe)
  DELETE FROM organizations WHERE true;

  -- Clean orphaned billing payment events
  DELETE FROM billing_payment_events WHERE true;

  RAISE NOTICE '✅ Phase 1 complete: All company data removed.';

  -- ════════════════════════════════════════════════════════════
  -- PHASE 2: Clean up user data except martinwong58@gmail.com
  -- ════════════════════════════════════════════════════════════

  -- Delete card_shares BEFORE profiles (card_shares.viewed_by_user_id → profiles)
  BEGIN
    DELETE FROM card_shares WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete nfc_tap_logs (references nfc_cards)
  BEGIN
    DELETE FROM nfc_tap_logs WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete nfc_cards for other users (references business_cards, auth.users)
  BEGIN
    DELETE FROM nfc_cards WHERE owner_id != v_user_id OR owner_id IS NULL;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete card sub-tables for cards belonging to other users
  BEGIN
    DELETE FROM card_experiences WHERE card_id IN (
      SELECT id FROM business_cards WHERE user_id != v_user_id
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM card_links WHERE card_id IN (
      SELECT id FROM business_cards WHERE user_id != v_user_id
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM card_fields WHERE card_id IN (
      SELECT id FROM business_cards WHERE user_id != v_user_id
    );
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete business_cards for other users
  BEGIN
    DELETE FROM business_cards WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete admin_users for other users
  BEGIN
    DELETE FROM admin_users WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete notifications for other users
  BEGIN
    DELETE FROM notifications WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete AI conversations for other users
  BEGIN
    DELETE FROM ai_conversations WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete AI agent sessions for other users
  BEGIN
    DELETE FROM ai_agent_sessions WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Delete offer_redemptions for other users
  BEGIN
    DELETE FROM offer_redemptions WHERE user_id != v_user_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Reset the kept user profile to clean state
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

  -- Delete profiles for other users
  DELETE FROM profiles WHERE id != v_user_id;

  RAISE NOTICE '✅ Phase 2 complete: All user data cleaned (kept martinwong58@gmail.com).';

  -- ════════════════════════════════════════════════════════════
  -- PHASE 3: Clean up community data
  -- ════════════════════════════════════════════════════════════

  -- Delete in dependency order: replies → posts → sub_boards → boards
  BEGIN
    DELETE FROM forum_replies WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM forum_posts WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM posts WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM connections WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM sub_boards WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM boards WHERE true;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RAISE NOTICE '✅ Phase 3 complete: All community data removed.';
  RAISE NOTICE '✅ Full cleanup complete. Kept user martinwong58@gmail.com (%).', v_user_id;
END $$;
