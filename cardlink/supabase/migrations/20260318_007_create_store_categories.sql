CREATE TABLE store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, slug)
);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON store_categories
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Public can read active categories" ON store_categories
  FOR SELECT USING (is_active = true);
