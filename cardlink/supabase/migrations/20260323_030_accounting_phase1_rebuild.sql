-- ============================================================
-- Accounting Phase-1 Rebuild: Core Tables Enhancement
-- Adds vendor bills (AP), payments, bank reconciliation,
-- fiscal period management, and enhances invoices.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. VENDOR BILLS (Accounts Payable)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_bills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bill_number   text NOT NULL,
  vendor_id     uuid REFERENCES contacts(id) ON DELETE SET NULL,
  vendor_name   text NOT NULL,
  vendor_email  text,
  issue_date    date NOT NULL DEFAULT CURRENT_DATE,
  due_date      date NOT NULL DEFAULT CURRENT_DATE,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','approved','partially_paid','paid','overdue','voided')),
  subtotal      numeric NOT NULL DEFAULT 0,
  tax           numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL DEFAULT 0,
  amount_paid   numeric NOT NULL DEFAULT 0,
  balance_due   numeric NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'USD',
  payment_terms text,
  notes         text,
  reference     text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, bill_number)
);

CREATE TABLE IF NOT EXISTS vendor_bill_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id       uuid NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  description   text NOT NULL,
  quantity      numeric NOT NULL DEFAULT 1,
  unit_price    numeric NOT NULL DEFAULT 0,
  tax_rate      numeric NOT NULL DEFAULT 0,
  amount        numeric NOT NULL DEFAULT 0,
  account_id    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read vendor_bills" ON vendor_bills
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write vendor_bills" ON vendor_bills
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update vendor_bills" ON vendor_bills
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members delete vendor_bills" ON vendor_bills
  FOR DELETE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members read vendor_bill_items" ON vendor_bill_items
  FOR SELECT USING (
    bill_id IN (SELECT id FROM vendor_bills WHERE org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write vendor_bill_items" ON vendor_bill_items
  FOR INSERT WITH CHECK (
    bill_id IN (SELECT id FROM vendor_bills WHERE org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update vendor_bill_items" ON vendor_bill_items
  FOR UPDATE USING (
    bill_id IN (SELECT id FROM vendor_bills WHERE org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members delete vendor_bill_items" ON vendor_bill_items
  FOR DELETE USING (
    bill_id IN (SELECT id FROM vendor_bills WHERE org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE INDEX idx_vendor_bills_org_status ON vendor_bills(org_id, status);
CREATE INDEX idx_vendor_bills_due_date ON vendor_bills(org_id, due_date);
CREATE INDEX idx_vendor_bill_items_bill ON vendor_bill_items(bill_id);

-- ────────────────────────────────────────────────────────────
-- 2. PAYMENTS (records payments against invoices and bills)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number  text NOT NULL,
  payment_type    text NOT NULL CHECK (payment_type IN ('received','made')),
  -- received = customer paying invoice (AR), made = paying vendor bill (AP)
  related_type    text NOT NULL CHECK (related_type IN ('invoice','vendor_bill')),
  related_id      uuid NOT NULL,
  contact_id      uuid REFERENCES contacts(id) ON DELETE SET NULL,
  amount          numeric NOT NULL CHECK (amount > 0),
  payment_method  text NOT NULL DEFAULT 'bank_transfer'
                    CHECK (payment_method IN ('cash','bank_transfer','credit_card','cheque','other')),
  payment_date    date NOT NULL DEFAULT CURRENT_DATE,
  reference       text,
  notes           text,
  currency        text NOT NULL DEFAULT 'USD',
  exchange_rate   numeric NOT NULL DEFAULT 1,
  transaction_id  uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, payment_number)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read payments" ON payments
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write payments" ON payments
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE INDEX idx_payments_org ON payments(org_id);
CREATE INDEX idx_payments_related ON payments(related_type, related_id);

-- ────────────────────────────────────────────────────────────
-- 3. BANK ACCOUNTS & RECONCILIATION
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_name    text NOT NULL,
  account_number  text,
  bank_name       text,
  currency        text NOT NULL DEFAULT 'USD',
  ledger_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, account_name)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id   uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_date  date NOT NULL,
  description       text NOT NULL,
  amount            numeric NOT NULL,
  -- positive = deposit/credit, negative = withdrawal/debit
  reference         text,
  source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual','import','feed')),
  is_reconciled     boolean NOT NULL DEFAULT false,
  matched_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id   uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  statement_date    date NOT NULL,
  statement_balance numeric NOT NULL,
  ledger_balance    numeric NOT NULL DEFAULT 0,
  difference        numeric NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress','completed')),
  matched_count     integer NOT NULL DEFAULT 0,
  unmatched_count   integer NOT NULL DEFAULT 0,
  reconciled_by     uuid,
  reconciled_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read bank_accounts" ON bank_accounts
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write bank_accounts" ON bank_accounts
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update bank_accounts" ON bank_accounts
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members read bank_transactions" ON bank_transactions
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write bank_transactions" ON bank_transactions
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update bank_transactions" ON bank_transactions
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members read bank_reconciliations" ON bank_reconciliations
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write bank_reconciliations" ON bank_reconciliations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update bank_reconciliations" ON bank_reconciliations
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE INDEX idx_bank_accounts_org ON bank_accounts(org_id);
CREATE INDEX idx_bank_transactions_account ON bank_transactions(bank_account_id, transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);
CREATE INDEX idx_bank_reconciliations_account ON bank_reconciliations(bank_account_id);

-- ────────────────────────────────────────────────────────────
-- 4. FISCAL YEARS & PERIODS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_years (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','closed','locked')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name),
  CONSTRAINT fiscal_year_dates CHECK (end_date > start_date)
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id  uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','closed','locked')),
  closed_by       uuid,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, fiscal_year_id, name),
  CONSTRAINT fiscal_period_dates CHECK (end_date > start_date)
);

ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read fiscal_years" ON fiscal_years
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write fiscal_years" ON fiscal_years
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update fiscal_years" ON fiscal_years
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Members read fiscal_periods" ON fiscal_periods
  FOR SELECT USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members write fiscal_periods" ON fiscal_periods
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );
CREATE POLICY "Members update fiscal_periods" ON fiscal_periods
  FOR UPDATE USING (
    org_id IN (SELECT id FROM organizations WHERE id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ))
  );

CREATE INDEX idx_fiscal_years_org ON fiscal_years(org_id);
CREATE INDEX idx_fiscal_periods_year ON fiscal_periods(fiscal_year_id);
CREATE INDEX idx_fiscal_periods_dates ON fiscal_periods(org_id, start_date, end_date);

-- ────────────────────────────────────────────────────────────
-- 5. ENHANCE EXISTING INVOICES (add payment tracking fields)
-- ────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ────────────────────────────────────────────────────────────
-- 6. RPC: Validate that a journal entry date falls in an open period
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_period_open(p_org_id uuid, p_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_status text;
BEGIN
  SELECT status INTO v_period_status
  FROM fiscal_periods
  WHERE org_id = p_org_id
    AND p_date >= start_date
    AND p_date <= end_date
  ORDER BY start_date DESC
  LIMIT 1;

  -- If no period defined, allow (period management is optional)
  IF v_period_status IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_period_status = 'open';
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 7. RPC: Auto-generate fiscal periods (monthly) for a year
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_fiscal_periods(
  p_fiscal_year_id uuid,
  p_org_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start date;
  v_end date;
  v_month_start date;
  v_month_end date;
  v_count integer := 0;
BEGIN
  SELECT start_date, end_date INTO v_start, v_end
  FROM fiscal_years
  WHERE id = p_fiscal_year_id AND org_id = p_org_id;

  IF v_start IS NULL THEN
    RETURN 0;
  END IF;

  v_month_start := v_start;

  WHILE v_month_start < v_end LOOP
    v_month_end := LEAST(
      (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::date,
      v_end
    );

    INSERT INTO fiscal_periods (fiscal_year_id, org_id, name, start_date, end_date, status)
    VALUES (
      p_fiscal_year_id,
      p_org_id,
      TO_CHAR(v_month_start, 'Mon YYYY'),
      v_month_start,
      v_month_end,
      'open'
    )
    ON CONFLICT (org_id, fiscal_year_id, name) DO NOTHING;

    v_count := v_count + 1;
    v_month_start := (v_month_start + INTERVAL '1 month')::date;
  END LOOP;

  RETURN v_count;
END;
$$;
