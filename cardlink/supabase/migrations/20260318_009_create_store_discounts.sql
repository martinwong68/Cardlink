CREATE TABLE store_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric NOT NULL,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','category','product')),
  target_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own discounts" ON store_discounts
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
