-- Departments as structured data (replaces free-text department on hr_employees)
CREATE TABLE hr_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage departments" ON hr_departments
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE UNIQUE INDEX hr_departments_company_name ON hr_departments(company_id, name);
