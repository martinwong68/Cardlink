-- Migration: Create inv_stock_takes and inv_stock_take_items for physical inventory

CREATE TABLE IF NOT EXISTS inv_stock_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES inv_warehouses(id) ON DELETE SET NULL,
  reference_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, reference_number)
);

CREATE TABLE IF NOT EXISTS inv_stock_take_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id uuid NOT NULL REFERENCES inv_stock_takes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES inv_products(id) ON DELETE CASCADE,
  system_qty numeric(14,2) NOT NULL DEFAULT 0,
  counted_qty numeric(14,2),
  variance numeric(14,2) GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_stock_takes_company ON inv_stock_takes(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_take_items_take ON inv_stock_take_items(stock_take_id);

ALTER TABLE inv_stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock_take_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_stock_takes_select" ON inv_stock_takes
  FOR SELECT USING (can_manage_company(company_id));
CREATE POLICY "inv_stock_takes_insert" ON inv_stock_takes
  FOR INSERT WITH CHECK (can_manage_company(company_id));
CREATE POLICY "inv_stock_takes_update" ON inv_stock_takes
  FOR UPDATE USING (can_manage_company(company_id));
CREATE POLICY "inv_stock_takes_delete" ON inv_stock_takes
  FOR DELETE USING (can_manage_company(company_id));

CREATE POLICY "inv_stock_take_items_select" ON inv_stock_take_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inv_stock_takes st
      WHERE st.id = stock_take_id AND can_manage_company(st.company_id)
    )
  );
CREATE POLICY "inv_stock_take_items_insert" ON inv_stock_take_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inv_stock_takes st
      WHERE st.id = stock_take_id AND can_manage_company(st.company_id)
    )
  );
CREATE POLICY "inv_stock_take_items_update" ON inv_stock_take_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM inv_stock_takes st
      WHERE st.id = stock_take_id AND can_manage_company(st.company_id)
    )
  );
