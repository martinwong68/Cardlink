-- ================================================================
-- Phase 2 Comprehensive Rebuild Migration
-- Covers: HR, Inventory, Procurement, POS enhancements
-- Migration: 20260323_032_phase2_comprehensive_rebuild.sql
-- ================================================================

-- ────────────────────────────────────────────────────────────
-- 1. HR PHASE 2 — Leave Accrual & Payroll Tax Configuration
-- ────────────────────────────────────────────────────────────

-- Leave accrual / entitlement configuration per leave type
CREATE TABLE IF NOT EXISTS hr_leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,                     -- e.g. "Annual Leave", "Sick Leave"
  leave_type text NOT NULL,               -- annual, sick, maternity, paternity, unpaid, compassionate
  days_per_year numeric(5,1) NOT NULL DEFAULT 0,
  accrual_method text NOT NULL DEFAULT 'annual', -- annual, monthly, bi_weekly
  max_carry_forward numeric(5,1) DEFAULT 0,
  max_accumulation numeric(5,1) DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT true,
  is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr_leave_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_leave_policies_company" ON hr_leave_policies
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_hr_leave_policies_company ON hr_leave_policies(company_id);

-- Payroll tax brackets / deduction rules
CREATE TABLE IF NOT EXISTS hr_payroll_tax_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,                     -- e.g. "Federal Income Tax", "Social Security"
  tax_type text NOT NULL DEFAULT 'income',-- income, social_security, medicare, state, local, other
  bracket_min numeric(12,2) NOT NULL DEFAULT 0,
  bracket_max numeric(12,2),              -- NULL = no upper limit
  rate numeric(6,4) NOT NULL,             -- e.g. 0.2200 for 22%
  fixed_amount numeric(12,2) DEFAULT 0,   -- flat amount per period
  is_employer_contribution boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr_payroll_tax_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_payroll_tax_brackets_company" ON hr_payroll_tax_brackets
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_hr_payroll_tax_company ON hr_payroll_tax_brackets(company_id, is_active);

-- Payroll deduction configuration (benefits, insurance, etc.)
CREATE TABLE IF NOT EXISTS hr_payroll_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,                     -- e.g. "Health Insurance", "401k"
  deduction_type text NOT NULL DEFAULT 'benefit', -- benefit, insurance, retirement, loan, other
  calculation_method text NOT NULL DEFAULT 'fixed', -- fixed, percentage
  amount numeric(12,2) DEFAULT 0,
  percentage numeric(6,4) DEFAULT 0,
  max_annual numeric(12,2),
  is_pre_tax boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr_payroll_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_payroll_deductions_company" ON hr_payroll_deductions
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

-- Employee payroll detail (bank info, tax status)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hr_employees' AND column_name = 'bank_name') THEN
    ALTER TABLE hr_employees ADD COLUMN bank_name text;
    ALTER TABLE hr_employees ADD COLUMN bank_account_number text;
    ALTER TABLE hr_employees ADD COLUMN bank_routing_number text;
    ALTER TABLE hr_employees ADD COLUMN tax_id text;
    ALTER TABLE hr_employees ADD COLUMN tax_filing_status text DEFAULT 'single'; -- single, married, head_of_household
    ALTER TABLE hr_employees ADD COLUMN emergency_contact_name text;
    ALTER TABLE hr_employees ADD COLUMN emergency_contact_phone text;
  END IF;
END $$;

-- Payslip records for PDF/history
CREATE TABLE IF NOT EXISTS hr_payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  payroll_id uuid REFERENCES hr_payroll(id),
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  gross_pay numeric(12,2) NOT NULL DEFAULT 0,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0,
  total_taxes numeric(12,2) NOT NULL DEFAULT 0,
  net_pay numeric(12,2) NOT NULL DEFAULT 0,
  deduction_details jsonb DEFAULT '[]'::jsonb,
  tax_details jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft, finalized, paid
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr_payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_payslips_company" ON hr_payslips
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_hr_payslips_employee ON hr_payslips(employee_id, pay_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_company ON hr_payslips(company_id, pay_period_start DESC);

-- ────────────────────────────────────────────────────────────
-- 2. INVENTORY PHASE 2 — Batch Tracking & Enhanced Categories
-- ────────────────────────────────────────────────────────────

-- Add description and product count to categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inv_categories' AND column_name = 'description') THEN
    ALTER TABLE inv_categories ADD COLUMN description text;
    ALTER TABLE inv_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Inventory batch / lot tracking
CREATE TABLE IF NOT EXISTS inv_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES inv_products(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  lot_number text,
  manufacture_date date,
  expiry_date date,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  warehouse_id uuid REFERENCES inv_warehouses(id),
  cost_price numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inv_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_batches_company" ON inv_batches
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_inv_batches_product ON inv_batches(product_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_inv_batches_company ON inv_batches(company_id);

-- Add warehouse_id to stock balances for multi-warehouse tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inv_stock_balances' AND column_name = 'warehouse_id') THEN
    ALTER TABLE inv_stock_balances ADD COLUMN warehouse_id uuid REFERENCES inv_warehouses(id);
  END IF;
END $$;

-- Inventory import/export tracking
CREATE TABLE IF NOT EXISTS inv_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_rows integer DEFAULT 0,
  imported_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE inv_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_import_jobs_company" ON inv_import_jobs
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 3. PROCUREMENT PHASE 2 — RFQ & Approval Workflow
-- ────────────────────────────────────────────────────────────

-- RFQ (Request for Quotation) table
CREATE TABLE IF NOT EXISTS proc_rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rfq_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, closed, awarded
  deadline date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proc_rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc_rfqs_company" ON proc_rfqs
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

-- RFQ line items
CREATE TABLE IF NOT EXISTS proc_rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES proc_rfqs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES inv_products(id),
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs'
);

-- RFQ supplier responses / quotations
CREATE TABLE IF NOT EXISTS proc_rfq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES proc_rfqs(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES proc_suppliers(id) ON DELETE CASCADE,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  lead_time_days integer,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE proc_rfq_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc_rfq_responses_company" ON proc_rfq_responses
  USING (rfq_id IN (SELECT r.id FROM proc_rfqs r WHERE r.company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  )));

-- Add approval workflow fields to purchase orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proc_purchase_orders' AND column_name = 'approval_level') THEN
    ALTER TABLE proc_purchase_orders ADD COLUMN approval_level integer DEFAULT 1;
    ALTER TABLE proc_purchase_orders ADD COLUMN approved_by uuid REFERENCES auth.users(id);
    ALTER TABLE proc_purchase_orders ADD COLUMN approved_at timestamptz;
    ALTER TABLE proc_purchase_orders ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Supplier performance metrics
CREATE TABLE IF NOT EXISTS proc_supplier_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES proc_suppliers(id) ON DELETE CASCADE,
  po_id uuid REFERENCES proc_purchase_orders(id),
  quality_score integer CHECK (quality_score BETWEEN 1 AND 5),
  delivery_score integer CHECK (delivery_score BETWEEN 1 AND 5),
  price_score integer CHECK (price_score BETWEEN 1 AND 5),
  overall_score numeric(3,1),
  comments text,
  rated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proc_supplier_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proc_supplier_ratings_company" ON proc_supplier_ratings
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 4. POS PHASE 2 — Receipt Templates & Customer Display
-- ────────────────────────────────────────────────────────────

-- Receipt template configuration
CREATE TABLE IF NOT EXISTS pos_receipt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  header_text text,
  footer_text text,
  show_logo boolean DEFAULT true,
  show_tax_breakdown boolean DEFAULT true,
  show_payment_method boolean DEFAULT true,
  paper_width text DEFAULT '80mm',  -- 80mm, 58mm, A4
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pos_receipt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_receipt_templates_company" ON pos_receipt_templates
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

-- Customer loyalty / rewards
CREATE TABLE IF NOT EXISTS pos_loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  order_id uuid REFERENCES pos_orders(id),
  points integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'earn', -- earn, redeem, expire, adjust
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pos_loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_loyalty_points_company" ON pos_loyalty_points
  USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pos_loyalty_customer ON pos_loyalty_points(company_id, customer_id);

-- Add loyalty points earned/redeemed to orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_orders' AND column_name = 'loyalty_points_earned') THEN
    ALTER TABLE pos_orders ADD COLUMN loyalty_points_earned integer DEFAULT 0;
    ALTER TABLE pos_orders ADD COLUMN loyalty_points_redeemed integer DEFAULT 0;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee_dates
  ON hr_leave_requests(employee_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_company_period
  ON hr_payroll(company_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_inv_products_company_category
  ON inv_products(company_id, category_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product_date
  ON inv_stock_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proc_purchase_orders_status
  ON proc_purchase_orders(company_id, status);

CREATE INDEX IF NOT EXISTS idx_pos_orders_company_date
  ON pos_orders(company_id, created_at DESC);
