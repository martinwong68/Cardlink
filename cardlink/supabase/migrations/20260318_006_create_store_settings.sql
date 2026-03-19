CREATE TABLE store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  store_name text,
  description text,
  banner_url text,
  theme_color text NOT NULL DEFAULT '#6366f1',
  operating_hours jsonb DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  delivery_options jsonb DEFAULT '{"enabled":false,"fee":0,"free_threshold":0}',
  payment_methods jsonb DEFAULT '{"cash":true,"bank_transfer":false,"online":false}',
  store_policies text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own store" ON store_settings
  FOR ALL USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
