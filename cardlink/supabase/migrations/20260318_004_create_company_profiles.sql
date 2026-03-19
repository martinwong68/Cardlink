CREATE TABLE company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  registration_number text,
  industry text,
  company_size text CHECK (company_size IN ('1-5','6-20','21-50','50+')),
  year_established integer,
  address_line1 text,
  address_line2 text,
  city text,
  state_region text,
  postal_code text,
  country text,
  phone text,
  email text,
  website text,
  default_currency text NOT NULL DEFAULT 'USD' CHECK (default_currency IN ('MYR','HKD','SGD','USD')),
  tax_registration_number text,
  tax_rate numeric,
  fiscal_year_end text,
  accounting_basis text CHECK (accounting_basis IN ('cash','accrual')),
  enabled_modules jsonb NOT NULL DEFAULT '["accounting","inventory","pos","crm"]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own company profile" ON company_profiles
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own company profile" ON company_profiles
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Users can update own company profile" ON company_profiles
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
