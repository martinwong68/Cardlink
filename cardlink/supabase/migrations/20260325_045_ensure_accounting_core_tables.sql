-- ============================================================
-- Ensure core accounting tables exist.
--
-- organizations, accounts, transactions, and transaction_lines
-- may already exist from initial setup.  This migration uses
-- CREATE TABLE IF NOT EXISTS so it is safe to re-run.
-- ============================================================

-- 1. organizations — 1:1 overlay on companies
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  name       text NOT NULL,
  currency   text NOT NULL DEFAULT 'USD',
  tax_id     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members read organizations" ON organizations
    FOR SELECT USING (id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members write organizations" ON organizations
    FOR INSERT WITH CHECK (id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members update organizations" ON organizations
    FOR UPDATE USING (id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. accounts — chart of accounts
CREATE TABLE IF NOT EXISTS accounts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code       text NOT NULL,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('asset','liability','equity','revenue','expense')),
  parent_id  uuid REFERENCES accounts(id) ON DELETE SET NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, code)
);

-- Ensure extra columns exist from phase-3 rebuild
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members read accounts" ON accounts
    FOR SELECT USING (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members write accounts" ON accounts
    FOR INSERT WITH CHECK (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members update accounts" ON accounts
    FOR UPDATE USING (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(org_id);

-- 3. Ensure transactions has org_id column
-- The table may have been created by migration 043 with company_id,
-- or by the accounting module setup with org_id.
-- We make sure org_id exists in either case.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Back-fill any rows where org_id is NULL but company_id is set
-- (company_id == org_id for the 1:1 overlay)
UPDATE transactions SET org_id = company_id WHERE org_id IS NULL AND company_id IS NOT NULL;

-- Also add a status column if missing (accounting schema uses it)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted';

CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(org_id);

-- 4. transaction_lines — double-entry bookkeeping lines
CREATE TABLE IF NOT EXISTS transaction_lines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  debit          numeric NOT NULL DEFAULT 0,
  credit         numeric NOT NULL DEFAULT 0,
  currency       text NOT NULL DEFAULT 'USD',
  exchange_rate  numeric NOT NULL DEFAULT 1,
  description    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members read transaction_lines" ON transaction_lines
    FOR SELECT USING (transaction_id IN (
      SELECT id FROM transactions WHERE org_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members write transaction_lines" ON transaction_lines
    FOR INSERT WITH CHECK (transaction_id IN (
      SELECT id FROM transactions WHERE org_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_transaction_lines_txn ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_account ON transaction_lines(account_id);
