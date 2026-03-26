-- ================================================================
-- Centralized Items Table
--
-- Master item catalog that syncs across all modules.
-- Each module (store, inventory, accounting, POS) can import
-- items from this table. Deleting an item from a module does NOT
-- delete it from the master table.
-- ================================================================

-- 1. Master items table
CREATE TABLE IF NOT EXISTS items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sku         text,
  description text,
  category    text,
  unit_price  numeric(14,2) DEFAULT 0,
  cost_price  numeric(14,2) DEFAULT 0,
  unit        text DEFAULT 'pcs',
  tax_rate    numeric(5,2) DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members read items" ON items
    FOR SELECT USING (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members write items" ON items
    FOR INSERT WITH CHECK (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members update items" ON items
    FOR UPDATE USING (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members delete items" ON items
    FOR DELETE USING (company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(company_id, sku);

-- 2. Link table: store_products → items (optional reference)
ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS master_item_id uuid REFERENCES items(id) ON DELETE SET NULL;

-- 3. Link table: inv_products → items (optional reference)
ALTER TABLE inv_products
  ADD COLUMN IF NOT EXISTS master_item_id uuid REFERENCES items(id) ON DELETE SET NULL;

-- 4. Create inventory_items table for accounting module (was missing)
CREATE TABLE IF NOT EXISTS inventory_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sku         text,
  quantity    numeric NOT NULL DEFAULT 0,
  unit_cost   numeric(14,2) NOT NULL DEFAULT 0,
  account_id  uuid REFERENCES accounts(id) ON DELETE SET NULL,
  category    text,
  master_item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, sku)
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members read inventory_items" ON inventory_items
    FOR SELECT USING (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members write inventory_items" ON inventory_items
    FOR INSERT WITH CHECK (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members update inventory_items" ON inventory_items
    FOR UPDATE USING (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members delete inventory_items" ON inventory_items
    FOR DELETE USING (org_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON inventory_items(org_id);
