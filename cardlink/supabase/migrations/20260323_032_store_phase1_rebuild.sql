-- =============================================================
-- Store Rebuild Phase 1 — Commerce-Ready Schema
-- Adds: customers, orders, order items, coupons, product variants
-- Enhances: store_products, store_discounts
-- =============================================================

-- ─── 1. Store Customers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text,
  phone       text,
  addresses   jsonb NOT NULL DEFAULT '[]',
  -- addresses: [{label, line1, line2, city, state, postal_code, country, is_default}]
  notes       text,
  total_orders    integer NOT NULL DEFAULT 0,
  total_spent     numeric(12,2) NOT NULL DEFAULT 0,
  last_order_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_customers_company ON store_customers(company_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_email ON store_customers(company_id, email) WHERE email IS NOT NULL;

ALTER TABLE store_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage store customers" ON store_customers
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 2. Store Orders ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number    text NOT NULL,
  customer_id     uuid REFERENCES store_customers(id) ON DELETE SET NULL,
  customer_name   text,
  customer_email  text,
  customer_phone  text,

  -- Totals
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_name   text,
  coupon_code     text,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(6,4) NOT NULL DEFAULT 0,
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,

  -- Status workflow: pending → confirmed → processing → shipped → delivered → completed
  -- Also: cancelled, refunded
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded')),

  -- Payment
  payment_method  text,        -- 'cash', 'bank_transfer', 'online', 'card'
  payment_status  text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','partial','refunded')),
  paid_at         timestamptz,

  -- Shipping
  shipping_address jsonb,      -- {line1, line2, city, state, postal_code, country}
  shipping_method  text,       -- 'standard', 'express', 'pickup'
  tracking_number  text,
  shipped_at       timestamptz,
  delivered_at     timestamptz,

  -- Refund
  refund_amount   numeric(12,2) DEFAULT 0,
  refund_reason   text,
  refunded_at     timestamptz,
  refunded_by     uuid,

  -- Notes
  notes           text,
  internal_notes  text,

  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_company ON store_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer ON store_orders(company_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_number ON store_orders(company_id, order_number);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage store orders" ON store_orders
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 3. Store Order Items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS store_order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES store_products(id) ON DELETE SET NULL,
  variant_id      uuid,
  product_name    text NOT NULL,
  variant_label   text,          -- e.g. "Red / Large"
  sku             text,
  qty             integer NOT NULL DEFAULT 1,
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  refunded_qty    integer NOT NULL DEFAULT 0,
  product_type    text DEFAULT 'physical',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage store order items" ON store_order_items
  FOR ALL USING (order_id IN (
    SELECT id FROM store_orders WHERE company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  ));

-- ─── 4. Store Coupons ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code            text NOT NULL,
  name            text,
  discount_type   text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  numeric(12,2) NOT NULL,
  min_order_amount numeric(12,2) DEFAULT 0,
  max_discount     numeric(12,2),        -- cap for percentage discounts
  applies_to      text NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all','category','product')),
  target_id       uuid,                  -- category or product id
  usage_limit     integer,               -- total uses allowed (null = unlimited)
  usage_count     integer NOT NULL DEFAULT 0,
  per_customer_limit integer DEFAULT 1,  -- uses per customer
  is_active       boolean NOT NULL DEFAULT true,
  valid_from      timestamptz,
  valid_until     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_store_coupons_company ON store_coupons(company_id);
CREATE INDEX IF NOT EXISTS idx_store_coupons_code ON store_coupons(company_id, code);

ALTER TABLE store_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage store coupons" ON store_coupons
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));

-- ─── 5. Store Product Variants ──────────────────────────────
CREATE TABLE IF NOT EXISTS store_product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  option_values jsonb NOT NULL DEFAULT '{}',
  -- e.g. {"Color": "Red", "Size": "L"}
  sku         text,
  price       numeric(12,2),              -- override product price if set
  compare_at_price numeric(12,2),
  stock_quantity integer NOT NULL DEFAULT 0,
  weight      numeric,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_variants_product ON store_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_store_variants_company ON store_product_variants(company_id);

ALTER TABLE store_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage product variants" ON store_product_variants
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Public can read active variants" ON store_product_variants
  FOR SELECT USING (is_active = true);

-- ─── 6. Enhance store_products — add variant support ────────
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS variant_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS variant_options jsonb DEFAULT '[]';
-- variant_options: [{"name":"Color","values":["Red","Blue"]},{"name":"Size","values":["S","M","L"]}]

-- ─── 7. Generate Order Number RPC ───────────────────────────
CREATE OR REPLACE FUNCTION generate_store_order_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_number text;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM store_orders
  WHERE company_id = p_company_id;

  v_number := 'SO-' || LPAD(v_count::text, 6, '0');
  RETURN v_number;
END;
$$;

-- ─── 8. Update Customer Stats on Order ─────────────────────
CREATE OR REPLACE FUNCTION update_store_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status IN ('completed','delivered') THEN
    UPDATE store_customers SET
      total_orders = (
        SELECT COUNT(*) FROM store_orders
        WHERE customer_id = NEW.customer_id
        AND status IN ('completed','delivered')
      ),
      total_spent = (
        SELECT COALESCE(SUM(total), 0) FROM store_orders
        WHERE customer_id = NEW.customer_id
        AND status IN ('completed','delivered')
      ),
      last_order_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_store_order_update_customer_stats
  AFTER INSERT OR UPDATE OF status ON store_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_store_customer_stats();

-- ─── 9. Performance Indexes ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_products_variant ON store_products(company_id) WHERE variant_enabled = true;
CREATE INDEX IF NOT EXISTS idx_store_orders_payment ON store_orders(company_id, payment_status);
