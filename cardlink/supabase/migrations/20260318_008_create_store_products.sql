CREATE TABLE store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES store_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  product_type text NOT NULL DEFAULT 'physical' CHECK (product_type IN ('physical','service','digital')),
  sku text,
  stock_quantity integer,
  weight numeric,
  duration_minutes integer,
  file_url text,
  images jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  inventory_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON store_products
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Public can read active products" ON store_products
  FOR SELECT USING (is_active = true);
