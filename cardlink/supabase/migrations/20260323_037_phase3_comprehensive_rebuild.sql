-- ============================================================
-- Migration 037: Phase 3 — Comprehensive Platform Rebuild
-- All modules brought to professional SMC-ready level
-- ============================================================
-- Covers: Accounting, HR, POS, Booking, CRM, Store, Inventory
-- Pattern: CREATE TABLE IF NOT EXISTS + ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- RLS: company_members scoped (standard pattern)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ACCOUNTING MODULE — Bank, Periods, Estimates, Credit Notes
-- ────────────────────────────────────────────────────────────

-- 1a. Bank Accounts
CREATE TABLE IF NOT EXISTS acct_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text,
  routing_number text,
  currency text NOT NULL DEFAULT 'MYR',
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  current_balance numeric(15,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE acct_bank_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_bank_accounts' AND policyname='acct_bank_accounts_company') THEN
    EXECUTE 'CREATE POLICY "acct_bank_accounts_company" ON acct_bank_accounts USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 1b. Bank Statements (imported)
CREATE TABLE IF NOT EXISTS acct_bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES acct_bank_accounts(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  opening_balance numeric(15,2),
  closing_balance numeric(15,2),
  file_url text,
  status text NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','reconciling','reconciled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE acct_bank_statements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_bank_statements' AND policyname='acct_bank_statements_company') THEN
    EXECUTE 'CREATE POLICY "acct_bank_statements_company" ON acct_bank_statements USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 1c. Bank Statement Lines
CREATE TABLE IF NOT EXISTS acct_bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES acct_bank_statements(id) ON DELETE CASCADE,
  line_date date NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL,
  reference text,
  matched_transaction_id uuid REFERENCES transactions(id),
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','matched','created')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE acct_bank_statement_lines ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_bank_statement_lines' AND policyname='acct_bank_statement_lines_company') THEN
    EXECUTE 'CREATE POLICY "acct_bank_statement_lines_company" ON acct_bank_statement_lines USING (statement_id IN (SELECT bs.id FROM acct_bank_statements bs WHERE bs.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())))';
  END IF;
END $$;

-- 1d. Fiscal Years & Periods
CREATE TABLE IF NOT EXISTS acct_fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closing','closed')),
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, start_date)
);
ALTER TABLE acct_fiscal_years ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_fiscal_years' AND policyname='acct_fiscal_years_company') THEN
    EXECUTE 'CREATE POLICY "acct_fiscal_years_company" ON acct_fiscal_years USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS acct_fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES acct_fiscal_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  period_number int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closing','closed','locked')),
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(fiscal_year_id, period_number)
);
ALTER TABLE acct_fiscal_periods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_fiscal_periods' AND policyname='acct_fiscal_periods_company') THEN
    EXECUTE 'CREATE POLICY "acct_fiscal_periods_company" ON acct_fiscal_periods USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 1e. Estimates / Quotes
CREATE TABLE IF NOT EXISTS acct_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  estimate_number text NOT NULL,
  contact_id uuid,
  title text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_total numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  converted_invoice_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, estimate_number)
);
ALTER TABLE acct_estimates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_estimates' AND policyname='acct_estimates_company') THEN
    EXECUTE 'CREATE POLICY "acct_estimates_company" ON acct_estimates USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS acct_estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES acct_estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1f. Credit Notes
CREATE TABLE IF NOT EXISTS acct_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credit_note_number text NOT NULL,
  invoice_id uuid REFERENCES invoices(id),
  contact_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','applied','voided')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_total numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  amount_applied numeric(15,2) NOT NULL DEFAULT 0,
  remaining numeric(15,2) NOT NULL DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, credit_note_number)
);
ALTER TABLE acct_credit_notes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_credit_notes' AND policyname='acct_credit_notes_company') THEN
    EXECUTE 'CREATE POLICY "acct_credit_notes_company" ON acct_credit_notes USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS acct_credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES acct_credit_notes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1g. Payment Records (unified payment tracking)
CREATE TABLE IF NOT EXISTS acct_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('receivable','payable')),
  invoice_id uuid,
  bill_id uuid,
  contact_id uuid,
  bank_account_id uuid REFERENCES acct_bank_accounts(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'MYR',
  payment_method text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash','bank_transfer','cheque','credit_card','online','other')),
  reference text,
  notes text,
  transaction_id uuid REFERENCES transactions(id),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE acct_payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_payments' AND policyname='acct_payments_company') THEN
    EXECUTE 'CREATE POLICY "acct_payments_company" ON acct_payments USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 1h. Recurring Invoice Templates
CREATE TABLE IF NOT EXISTS acct_recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid,
  title text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','yearly')),
  next_issue_date date NOT NULL,
  end_date date,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_total numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  last_generated_at timestamptz,
  times_generated int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE acct_recurring_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='acct_recurring_invoices' AND policyname='acct_recurring_invoices_company') THEN
    EXECUTE 'CREATE POLICY "acct_recurring_invoices_company" ON acct_recurring_invoices USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 1i. Accounting column additions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='is_locked') THEN
    ALTER TABLE accounts ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='description') THEN
    ALTER TABLE accounts ADD COLUMN description text;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. HR MODULE — Leave Balances, Departments, Positions, Onboarding
-- ────────────────────────────────────────────────────────────

-- 2a. Leave Balances (tracked per employee per leave type)
CREATE TABLE IF NOT EXISTS hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  leave_type text NOT NULL,
  year int NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  entitlement numeric(5,1) NOT NULL DEFAULT 0,
  used numeric(5,1) NOT NULL DEFAULT 0,
  pending numeric(5,1) NOT NULL DEFAULT 0,
  carried_forward numeric(5,1) NOT NULL DEFAULT 0,
  balance numeric(5,1) GENERATED ALWAYS AS (entitlement + carried_forward - used - pending) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, leave_type, year)
);
ALTER TABLE hr_leave_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_leave_balances' AND policyname='hr_leave_balances_company') THEN
    EXECUTE 'CREATE POLICY "hr_leave_balances_company" ON hr_leave_balances USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2b. Departments (proper entity)
CREATE TABLE IF NOT EXISTS hr_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  manager_id uuid,
  parent_department_id uuid REFERENCES hr_departments(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);
ALTER TABLE hr_departments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_departments' AND policyname='hr_departments_company') THEN
    EXECUTE 'CREATE POLICY "hr_departments_company" ON hr_departments USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2c. Positions
CREATE TABLE IF NOT EXISTS hr_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  department_id uuid REFERENCES hr_departments(id),
  description text,
  level int,
  salary_range_min numeric(15,2),
  salary_range_max numeric(15,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, title)
);
ALTER TABLE hr_positions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_positions' AND policyname='hr_positions_company') THEN
    EXECUTE 'CREATE POLICY "hr_positions_company" ON hr_positions USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2d. Onboarding Checklists
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  task_name text NOT NULL,
  description text,
  due_date date,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_onboarding_tasks' AND policyname='hr_onboarding_tasks_company') THEN
    EXECUTE 'CREATE POLICY "hr_onboarding_tasks_company" ON hr_onboarding_tasks USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2e. Public Holidays
CREATE TABLE IF NOT EXISTS hr_public_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  holiday_date date NOT NULL,
  country_code text NOT NULL DEFAULT 'MY',
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, holiday_date, name)
);
ALTER TABLE hr_public_holidays ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_public_holidays' AND policyname='hr_public_holidays_company') THEN
    EXECUTE 'CREATE POLICY "hr_public_holidays_company" ON hr_public_holidays USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2f. Employee Document Management
CREATE TABLE IF NOT EXISTS hr_employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('contract','id_card','passport','certificate','medical','other')),
  title text NOT NULL,
  file_url text NOT NULL,
  file_size int,
  expiry_date date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_employee_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_employee_documents' AND policyname='hr_employee_documents_company') THEN
    EXECUTE 'CREATE POLICY "hr_employee_documents_company" ON hr_employee_documents USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 2g. HR Employee column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='hr_employees') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='manager_id') THEN
      ALTER TABLE hr_employees ADD COLUMN manager_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='department_id') THEN
      ALTER TABLE hr_employees ADD COLUMN department_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='position_id') THEN
      ALTER TABLE hr_employees ADD COLUMN position_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='national_id') THEN
      ALTER TABLE hr_employees ADD COLUMN national_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='date_of_birth') THEN
      ALTER TABLE hr_employees ADD COLUMN date_of_birth date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='probation_end_date') THEN
      ALTER TABLE hr_employees ADD COLUMN probation_end_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hr_employees' AND column_name='work_permit_expiry') THEN
      ALTER TABLE hr_employees ADD COLUMN work_permit_expiry date;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. POS MODULE — Split Payment, Partial Refund, Loyalty
-- ────────────────────────────────────────────────────────────

-- 3a. Split Payments
CREATE TABLE IF NOT EXISTS pos_payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash','credit_card','debit_card','ewallet','bank_transfer','voucher','other')),
  amount numeric(15,2) NOT NULL,
  reference text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','voided')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pos_payment_splits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pos_payment_splits' AND policyname='pos_payment_splits_company') THEN
    EXECUTE 'CREATE POLICY "pos_payment_splits_company" ON pos_payment_splits USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 3b. Partial Refund Items
CREATE TABLE IF NOT EXISTS pos_refund_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  refund_id uuid NOT NULL,
  order_item_id uuid,
  product_name text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  refund_amount numeric(15,2) NOT NULL DEFAULT 0,
  reason text,
  restock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pos_refund_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pos_refund_items' AND policyname='pos_refund_items_company') THEN
    EXECUTE 'CREATE POLICY "pos_refund_items_company" ON pos_refund_items USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 3c. POS Daily Summaries (for end-of-day reporting)
CREATE TABLE IF NOT EXISTS pos_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  register_id uuid,
  summary_date date NOT NULL,
  total_sales numeric(15,2) NOT NULL DEFAULT 0,
  total_refunds numeric(15,2) NOT NULL DEFAULT 0,
  net_sales numeric(15,2) NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  total_refund_orders int NOT NULL DEFAULT 0,
  cash_total numeric(15,2) NOT NULL DEFAULT 0,
  card_total numeric(15,2) NOT NULL DEFAULT 0,
  other_total numeric(15,2) NOT NULL DEFAULT 0,
  tax_collected numeric(15,2) NOT NULL DEFAULT 0,
  loyalty_points_issued int NOT NULL DEFAULT 0,
  loyalty_points_redeemed int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, register_id, summary_date)
);
ALTER TABLE pos_daily_summaries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pos_daily_summaries' AND policyname='pos_daily_summaries_company') THEN
    EXECUTE 'CREATE POLICY "pos_daily_summaries_company" ON pos_daily_summaries USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 3d. POS column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pos_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_orders' AND column_name='customer_id') THEN
      ALTER TABLE pos_orders ADD COLUMN customer_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_orders' AND column_name='discount_id') THEN
      ALTER TABLE pos_orders ADD COLUMN discount_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_orders' AND column_name='discount_amount') THEN
      ALTER TABLE pos_orders ADD COLUMN discount_amount numeric(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pos_orders' AND column_name='receipt_number') THEN
      ALTER TABLE pos_orders ADD COLUMN receipt_number text;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. BOOKING MODULE — Staff, Settings, Notifications, Exceptions
-- ────────────────────────────────────────────────────────────

-- 4a. Booking Staff / Providers
CREATE TABLE IF NOT EXISTS booking_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  avatar_url text,
  specializations text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE booking_staff ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_staff' AND policyname='booking_staff_company') THEN
    EXECUTE 'CREATE POLICY "booking_staff_company" ON booking_staff USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4b. Booking Staff Availability (per-staff schedule)
CREATE TABLE IF NOT EXISTS booking_staff_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES booking_staff(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, day_of_week)
);
ALTER TABLE booking_staff_availability ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_staff_availability' AND policyname='booking_staff_availability_access') THEN
    EXECUTE 'CREATE POLICY "booking_staff_availability_access" ON booking_staff_availability USING (staff_id IN (SELECT bs.id FROM booking_staff bs WHERE bs.company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())))';
  END IF;
END $$;

-- 4c. Booking Public Settings
CREATE TABLE IF NOT EXISTS booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT false,
  public_slug text,
  booking_window_days int NOT NULL DEFAULT 30,
  min_advance_hours int NOT NULL DEFAULT 1,
  max_advance_days int NOT NULL DEFAULT 90,
  cancellation_hours int NOT NULL DEFAULT 24,
  confirmation_email_enabled boolean NOT NULL DEFAULT true,
  reminder_email_enabled boolean NOT NULL DEFAULT true,
  reminder_hours_before int NOT NULL DEFAULT 24,
  custom_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_settings' AND policyname='booking_settings_company') THEN
    EXECUTE 'CREATE POLICY "booking_settings_company" ON booking_settings USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4d. Booking Notifications (email/sms tracking)
CREATE TABLE IF NOT EXISTS booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  appointment_id uuid,
  notification_type text NOT NULL CHECK (notification_type IN ('confirmation','reminder','cancellation','reschedule','follow_up')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','push')),
  recipient_email text,
  recipient_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_notifications' AND policyname='booking_notifications_company') THEN
    EXECUTE 'CREATE POLICY "booking_notifications_company" ON booking_notifications USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4e. Booking Exceptions (holidays, special dates)
CREATE TABLE IF NOT EXISTS booking_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES booking_staff(id),
  exception_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE booking_exceptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_exceptions' AND policyname='booking_exceptions_company') THEN
    EXECUTE 'CREATE POLICY "booking_exceptions_company" ON booking_exceptions USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4f. Booking appointment column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='booking_appointments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_appointments' AND column_name='staff_id') THEN
      ALTER TABLE booking_appointments ADD COLUMN staff_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_appointments' AND column_name='customer_email') THEN
      ALTER TABLE booking_appointments ADD COLUMN customer_email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_appointments' AND column_name='customer_phone') THEN
      ALTER TABLE booking_appointments ADD COLUMN customer_phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_appointments' AND column_name='reschedule_count') THEN
      ALTER TABLE booking_appointments ADD COLUMN reschedule_count int DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_appointments' AND column_name='source') THEN
      ALTER TABLE booking_appointments ADD COLUMN source text DEFAULT 'admin';
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. CRM MODULE — Accounts, Address, Deal FK, Import
-- ────────────────────────────────────────────────────────────

-- 5a. CRM Accounts (Company/Organization entity)
CREATE TABLE IF NOT EXISTS crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  industry text,
  company_size text,
  website text,
  phone text,
  email text,
  street text,
  city text,
  state text,
  country text,
  postal_code text,
  description text,
  owner_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_accounts' AND policyname='crm_accounts_company') THEN
    EXECUTE 'CREATE POLICY "crm_accounts_company" ON crm_accounts USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 5b. CRM Import Jobs
CREATE TABLE IF NOT EXISTS crm_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  import_type text NOT NULL CHECK (import_type IN ('contacts','leads','deals','accounts')),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  total_rows int NOT NULL DEFAULT 0,
  imported_rows int NOT NULL DEFAULT 0,
  failed_rows int NOT NULL DEFAULT 0,
  error_log jsonb DEFAULT '[]',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE crm_import_jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_import_jobs' AND policyname='crm_import_jobs_company') THEN
    EXECUTE 'CREATE POLICY "crm_import_jobs_company" ON crm_import_jobs USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 5c. CRM Contact column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='crm_contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='street') THEN
      ALTER TABLE crm_contacts ADD COLUMN street text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='city') THEN
      ALTER TABLE crm_contacts ADD COLUMN city text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='state') THEN
      ALTER TABLE crm_contacts ADD COLUMN state text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='country') THEN
      ALTER TABLE crm_contacts ADD COLUMN country text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='postal_code') THEN
      ALTER TABLE crm_contacts ADD COLUMN postal_code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_contacts' AND column_name='account_id') THEN
      ALTER TABLE crm_contacts ADD COLUMN account_id uuid;
    END IF;
  END IF;
END $$;

-- 5d. CRM Deal column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='crm_deals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='contact_id') THEN
      ALTER TABLE crm_deals ADD COLUMN contact_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='account_id') THEN
      ALTER TABLE crm_deals ADD COLUMN account_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='lost_reason') THEN
      ALTER TABLE crm_deals ADD COLUMN lost_reason text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='lost_at') THEN
      ALTER TABLE crm_deals ADD COLUMN lost_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='expected_close_date') THEN
      ALTER TABLE crm_deals ADD COLUMN expected_close_date date;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_deals' AND column_name='probability') THEN
      ALTER TABLE crm_deals ADD COLUMN probability int DEFAULT 50;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 6. STORE MODULE — Cart, Checkout, Customer Accounts, Shipments
-- ────────────────────────────────────────────────────────────

-- 6a. Shopping Carts
CREATE TABLE IF NOT EXISTS store_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid,
  session_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','abandoned','expired')),
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_total numeric(15,2) NOT NULL DEFAULT 0,
  discount_total numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  coupon_code text,
  expires_at timestamptz DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE store_carts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_carts' AND policyname='store_carts_company') THEN
    EXECUTE 'CREATE POLICY "store_carts_company" ON store_carts USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 6b. Cart Items
CREATE TABLE IF NOT EXISTS store_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES store_carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(15,2) NOT NULL,
  total_price numeric(15,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6c. Store Customer Accounts
CREATE TABLE IF NOT EXISTS store_customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  password_hash text,
  street text,
  city text,
  state text,
  country text,
  postal_code text,
  default_shipping_address jsonb,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  total_orders int NOT NULL DEFAULT 0,
  total_spent numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);
ALTER TABLE store_customer_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_customer_accounts' AND policyname='store_customer_accounts_company') THEN
    EXECUTE 'CREATE POLICY "store_customer_accounts_company" ON store_customer_accounts USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 6d. Store Shipments / Fulfillment
CREATE TABLE IF NOT EXISTS store_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','label_created','picked_up','in_transit','out_for_delivery','delivered','returned','failed')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery date,
  shipping_cost numeric(15,2) DEFAULT 0,
  weight numeric(10,2),
  dimensions jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_shipments' AND policyname='store_shipments_company') THEN
    EXECUTE 'CREATE POLICY "store_shipments_company" ON store_shipments USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 6e. Store column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='store_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='customer_account_id') THEN
      ALTER TABLE store_orders ADD COLUMN customer_account_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='shipping_address') THEN
      ALTER TABLE store_orders ADD COLUMN shipping_address jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='billing_address') THEN
      ALTER TABLE store_orders ADD COLUMN billing_address jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='tracking_number') THEN
      ALTER TABLE store_orders ADD COLUMN tracking_number text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='shipped_at') THEN
      ALTER TABLE store_orders ADD COLUMN shipped_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_orders' AND column_name='delivered_at') THEN
      ALTER TABLE store_orders ADD COLUMN delivered_at timestamptz;
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 7. INVENTORY MODULE — Stock Counts, UoM, Variants, Reservation
-- ────────────────────────────────────────────────────────────

-- 7a. Stock Take / Physical Count
CREATE TABLE IF NOT EXISTS inv_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid,
  count_number text NOT NULL,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','cancelled')),
  notes text,
  counted_by uuid,
  approved_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, count_number)
);
ALTER TABLE inv_stock_counts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inv_stock_counts' AND policyname='inv_stock_counts_company') THEN
    EXECUTE 'CREATE POLICY "inv_stock_counts_company" ON inv_stock_counts USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 7b. Stock Count Lines
CREATE TABLE IF NOT EXISTS inv_stock_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES inv_stock_counts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  system_qty numeric(12,4) NOT NULL DEFAULT 0,
  counted_qty numeric(12,4),
  variance numeric(12,4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7c. Units of Measure
CREATE TABLE IF NOT EXISTS inv_units_of_measure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  abbreviation text NOT NULL,
  category text DEFAULT 'quantity' CHECK (category IN ('quantity','weight','volume','length','area','time')),
  is_base boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, abbreviation)
);
ALTER TABLE inv_units_of_measure ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inv_units_of_measure' AND policyname='inv_units_of_measure_company') THEN
    EXECUTE 'CREATE POLICY "inv_units_of_measure_company" ON inv_units_of_measure USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 7d. UoM Conversions
CREATE TABLE IF NOT EXISTS inv_uom_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_uom_id uuid NOT NULL REFERENCES inv_units_of_measure(id) ON DELETE CASCADE,
  to_uom_id uuid NOT NULL REFERENCES inv_units_of_measure(id) ON DELETE CASCADE,
  conversion_factor numeric(15,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, from_uom_id, to_uom_id)
);
ALTER TABLE inv_uom_conversions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inv_uom_conversions' AND policyname='inv_uom_conversions_company') THEN
    EXECUTE 'CREATE POLICY "inv_uom_conversions_company" ON inv_uom_conversions USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 7e. Product Variants (for inventory)
CREATE TABLE IF NOT EXISTS inv_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  variant_name text NOT NULL,
  sku text,
  barcode text,
  attributes jsonb NOT NULL DEFAULT '{}',
  price_override numeric(15,2),
  cost_override numeric(15,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inv_product_variants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inv_product_variants' AND policyname='inv_product_variants_company') THEN
    EXECUTE 'CREATE POLICY "inv_product_variants_company" ON inv_product_variants USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 7f. Inventory column additions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inv_products') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_products' AND column_name='preferred_supplier_id') THEN
      ALTER TABLE inv_products ADD COLUMN preferred_supplier_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_products' AND column_name='weight') THEN
      ALTER TABLE inv_products ADD COLUMN weight numeric(10,3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_products' AND column_name='dimensions') THEN
      ALTER TABLE inv_products ADD COLUMN dimensions jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_products' AND column_name='uom_id') THEN
      ALTER TABLE inv_products ADD COLUMN uom_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_products' AND column_name='max_stock') THEN
      ALTER TABLE inv_products ADD COLUMN max_stock numeric(12,4);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inv_stock_balances') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_stock_balances' AND column_name='reserved_qty') THEN
      ALTER TABLE inv_stock_balances ADD COLUMN reserved_qty numeric(12,4) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_stock_balances' AND column_name='available_qty') THEN
      ALTER TABLE inv_stock_balances ADD COLUMN available_qty numeric(12,4) GENERATED ALWAYS AS (on_hand - reserved_qty) STORED;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inv_stock_movements') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_stock_movements' AND column_name='batch_id') THEN
      ALTER TABLE inv_stock_movements ADD COLUMN batch_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inv_stock_movements' AND column_name='unit_cost') THEN
      ALTER TABLE inv_stock_movements ADD COLUMN unit_cost numeric(15,4);
    END IF;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 8. CROSS-MODULE — Audit Trail
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid,
  module text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('create','update','delete','status_change')),
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND policyname='audit_log_company') THEN
    EXECUTE 'CREATE POLICY "audit_log_company" ON audit_log USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON audit_log(company_id, module);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 9. INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_acct_bank_accounts_company ON acct_bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_acct_bank_statements_bank ON acct_bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_acct_fiscal_years_company ON acct_fiscal_years(company_id);
CREATE INDEX IF NOT EXISTS idx_acct_fiscal_periods_year ON acct_fiscal_periods(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_acct_estimates_company ON acct_estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_acct_credit_notes_company ON acct_credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_acct_payments_company ON acct_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_acct_payments_invoice ON acct_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_acct_recurring_company ON acct_recurring_invoices(company_id);

CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_emp ON hr_leave_balances(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_company ON hr_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_company ON hr_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_emp ON hr_onboarding_tasks(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_holidays_company ON hr_public_holidays(company_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_hr_documents_emp ON hr_employee_documents(company_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_pos_splits_order ON pos_payment_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_refund_items_refund ON pos_refund_items(refund_id);
CREATE INDEX IF NOT EXISTS idx_pos_daily_summary ON pos_daily_summaries(company_id, summary_date);

CREATE INDEX IF NOT EXISTS idx_booking_staff_company ON booking_staff(company_id);
CREATE INDEX IF NOT EXISTS idx_booking_settings_company ON booking_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_appt ON booking_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_booking_exceptions_company ON booking_exceptions(company_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_company ON crm_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_import_jobs_company ON crm_import_jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_store_carts_company ON store_carts(company_id);
CREATE INDEX IF NOT EXISTS idx_store_customer_accounts_company ON store_customer_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_order ON store_shipments(order_id);

CREATE INDEX IF NOT EXISTS idx_inv_stock_counts_company ON inv_stock_counts(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_uom_company ON inv_units_of_measure(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_variants_product ON inv_product_variants(product_id);
