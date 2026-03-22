-- Migration: Create inv_categories for product categorization

CREATE TABLE IF NOT EXISTS inv_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES inv_categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inv_categories_company ON inv_categories(company_id);

ALTER TABLE inv_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_categories_select" ON inv_categories
  FOR SELECT USING (can_manage_company(company_id));
CREATE POLICY "inv_categories_insert" ON inv_categories
  FOR INSERT WITH CHECK (can_manage_company(company_id));
CREATE POLICY "inv_categories_update" ON inv_categories
  FOR UPDATE USING (can_manage_company(company_id));
CREATE POLICY "inv_categories_delete" ON inv_categories
  FOR DELETE USING (can_manage_company(company_id));

-- Add FK from inv_products.category_id -> inv_categories.id
ALTER TABLE inv_products
  ADD CONSTRAINT fk_inv_products_category
  FOREIGN KEY (category_id) REFERENCES inv_categories(id) ON DELETE SET NULL;
