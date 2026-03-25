-- Create the transactions table used by accounting and AI operations.
-- This table was previously referenced but never explicitly created,
-- causing "amount column not found in schema cache" errors.

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense','transfer','adjustment')),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text DEFAULT 'general',
  reference_number text,
  payment_method text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns exist even if table was previously created without them
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Company members can read transactions
DO $$ BEGIN
  CREATE POLICY "Company members can read transactions"
    ON transactions FOR SELECT
    USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Company members can insert transactions
DO $$ BEGIN
  CREATE POLICY "Company members can insert transactions"
    ON transactions FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
