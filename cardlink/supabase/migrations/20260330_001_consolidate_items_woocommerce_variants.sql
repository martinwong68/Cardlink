-- ================================================================
-- Migration: Consolidate items + WooCommerce-style variant support
--
-- 1. Add product_type, product_attributes, images, slug,
--    compare_at_price, weight, max_stock_level columns to items.
-- 2. Create item_variations table (WooCommerce-style variations).
--
-- NOTE: Legacy tables (inv_products, inv_product_variants,
--   store_products, store_product_variants, inv_categories,
--   inventory_items) are preserved for backward compatibility.
--   New features should use items + item_variations exclusively.
-- ================================================================

-- ── 1. Extend the items master table ────────────────────────────

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'simple'
    CHECK (product_type IN ('simple','variable','service','digital'));

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS product_attributes jsonb NOT NULL DEFAULT '[]';
-- product_attributes stores an array:
-- [
--   { "name": "Color", "options": ["Red","Blue","Green"], "variation": true },
--   { "name": "Size",  "options": ["S","M","L","XL"],     "variation": true }
-- ]

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]';

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(14,2);

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS weight numeric;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS max_stock_level integer;

-- ── 2. Item Variations (WooCommerce-style) ──────────────────────

CREATE TABLE IF NOT EXISTS item_variations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attributes    jsonb NOT NULL DEFAULT '{}',
  -- e.g. {"Color": "Red", "Size": "L"}
  sku           text,
  barcode       text,
  price         numeric(14,2),
  compare_at_price numeric(14,2),
  cost_price    numeric(14,2),
  stock_quantity integer NOT NULL DEFAULT 0,
  weight        numeric,
  image_url     text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_variations_item ON item_variations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_variations_company ON item_variations(company_id);

ALTER TABLE item_variations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'item_variations' AND policyname = 'item_variations_select'
  ) THEN
    EXECUTE 'CREATE POLICY "item_variations_select" ON item_variations FOR SELECT USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'item_variations' AND policyname = 'item_variations_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "item_variations_insert" ON item_variations FOR INSERT WITH CHECK (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'item_variations' AND policyname = 'item_variations_update'
  ) THEN
    EXECUTE 'CREATE POLICY "item_variations_update" ON item_variations FOR UPDATE USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'item_variations' AND policyname = 'item_variations_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "item_variations_delete" ON item_variations FOR DELETE USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;
