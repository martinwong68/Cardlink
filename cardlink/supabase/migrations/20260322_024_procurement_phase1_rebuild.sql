-- Procurement module Phase-1 rebuild: schema enhancements + new tables
-- Applies to Supabase (PostgreSQL)

-- ─────────────────────────────────────────────────────
-- 1. Enhance proc_suppliers with professional fields
-- ─────────────────────────────────────────────────────
ALTER TABLE proc_suppliers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net_30'
    CHECK (payment_terms IN ('immediate','net_7','net_15','net_30','net_45','net_60','net_90')),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating smallint DEFAULT 0
    CHECK (rating >= 0 AND rating <= 5);

-- ─────────────────────────────────────────────────────
-- 2. Enhance proc_purchase_orders with linking + terms
-- ─────────────────────────────────────────────────────
ALTER TABLE proc_purchase_orders
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES proc_purchase_requests(id),
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  ADD COLUMN IF NOT EXISTS tax_percent numeric DEFAULT 0
    CHECK (tax_percent >= 0 AND tax_percent <= 100),
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms text;

-- ─────────────────────────────────────────────────────
-- 3. Purchase request line items
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proc_purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES proc_purchase_requests(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES inv_products(id),
  description text,
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  estimated_unit_cost numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proc_purchase_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage request items" ON proc_purchase_request_items
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────
-- 4. Vendor bills (AP invoices) for procure-to-pay
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proc_vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES proc_suppliers(id),
  po_id uuid REFERENCES proc_purchase_orders(id),
  receipt_id uuid REFERENCES proc_receipts(id),
  bill_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','approved','paid','cancelled')),
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_terms text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, bill_number)
);
ALTER TABLE proc_vendor_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage vendor bills" ON proc_vendor_bills
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────
-- 5. Vendor bill line items
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proc_vendor_bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES proc_vendor_bills(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES inv_products(id),
  description text,
  qty numeric NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE proc_vendor_bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage bill items" ON proc_vendor_bill_items
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
