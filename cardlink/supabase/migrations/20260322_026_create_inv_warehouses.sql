-- Migration: Create inv_warehouses for multi-location support

CREATE TABLE IF NOT EXISTS inv_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inv_warehouses_company ON inv_warehouses(company_id);

ALTER TABLE inv_warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_warehouses_select" ON inv_warehouses
  FOR SELECT USING (can_manage_company(company_id));
CREATE POLICY "inv_warehouses_insert" ON inv_warehouses
  FOR INSERT WITH CHECK (can_manage_company(company_id));
CREATE POLICY "inv_warehouses_update" ON inv_warehouses
  FOR UPDATE USING (can_manage_company(company_id));
CREATE POLICY "inv_warehouses_delete" ON inv_warehouses
  FOR DELETE USING (can_manage_company(company_id));

-- Add warehouse_id to stock balances (nullable for backward compat)
ALTER TABLE inv_stock_balances ADD COLUMN IF NOT EXISTS warehouse_id uuid
  REFERENCES inv_warehouses(id) ON DELETE SET NULL;

-- Add warehouse_id to stock movements (nullable for backward compat)
ALTER TABLE inv_stock_movements ADD COLUMN IF NOT EXISTS warehouse_id uuid
  REFERENCES inv_warehouses(id) ON DELETE SET NULL;

-- Add preferred_supplier FK
ALTER TABLE inv_products
  ADD CONSTRAINT fk_inv_products_preferred_supplier
  FOREIGN KEY (preferred_supplier_id) REFERENCES proc_suppliers(id) ON DELETE SET NULL;
