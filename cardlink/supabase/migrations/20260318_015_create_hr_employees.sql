CREATE TABLE hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  position text,
  department text,
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract')),
  start_date date,
  end_date date,
  salary numeric NOT NULL DEFAULT 0,
  salary_period text NOT NULL DEFAULT 'monthly' CHECK (salary_period IN ('monthly','hourly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','terminated')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage employees" ON hr_employees
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
