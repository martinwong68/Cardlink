-- Positions as structured data (replaces free-text position on hr_employees)
CREATE TABLE hr_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  department_id uuid REFERENCES hr_departments(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage positions" ON hr_positions
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE UNIQUE INDEX hr_positions_company_title ON hr_positions(company_id, title);
