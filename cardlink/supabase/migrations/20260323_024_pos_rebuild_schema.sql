-- =============================================================
-- POS Rebuild Phase 1 — Schema Enhancements
-- Adds: tax config, discounts, customer link, order notes
-- =============================================================

-- ─── 1. POS Tax Configuration ───────────────────────────────
CREATE TABLE IF NOT EXISTS pos_tax_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,                    -- e.g. "Standard VAT", "Sales Tax"
  rate        numeric(6,4) NOT NULL DEFAULT 0,  -- e.g. 0.0800 = 8%
  region      text,                             -- optional region code
  is_default  boolean NOT NULL DEFAULT false,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_tax_config_company ON pos_tax_config(company_id);

ALTER TABLE pos_tax_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage POS tax config" ON pos_tax_config
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 2. POS Discounts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_discounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,                  -- e.g. "10% Off", "Holiday Sale"
  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  value         numeric(12,2) NOT NULL DEFAULT 0,  -- percentage (0-100) or fixed amount
  min_order     numeric(12,2) DEFAULT 0,           -- minimum order amount to apply
  is_active     boolean NOT NULL DEFAULT true,
  valid_from    timestamptz,
  valid_until   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_discounts_company ON pos_discounts(company_id);

ALTER TABLE pos_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage POS discounts" ON pos_discounts
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 3. Enhance pos_orders — add customer, discount, tax columns ─
-- Add customer_id FK to link CRM contacts or membership accounts
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS customer_phone text;

-- Add discount tracking
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS discount_name text;

-- Add tax rate used (was hardcoded; now dynamic)
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS tax_rate numeric(6,4) NOT NULL DEFAULT 0.0800;

-- Add cash tendered and change for cash payments
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS cash_tendered numeric(12,2);
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS cash_change numeric(12,2);

-- Add refund metadata
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refunded_by uuid;

-- Add partial refund support
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS refund_amount numeric(12,2) DEFAULT 0;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS original_order_id uuid;

-- ─── 4. Enhance pos_order_items — add refund tracking ──────
ALTER TABLE pos_order_items ADD COLUMN IF NOT EXISTS refunded_qty integer NOT NULL DEFAULT 0;
ALTER TABLE pos_order_items ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0;

-- ─── 5. Create index for customer order lookup ─────────────
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer ON pos_orders(company_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_orders_created ON pos_orders(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON pos_orders(company_id, status);
