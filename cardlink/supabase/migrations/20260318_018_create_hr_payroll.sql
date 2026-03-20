CREATE TABLE hr_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  basic_salary numeric NOT NULL DEFAULT 0,
  overtime numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  allowances numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage payroll" ON hr_payroll
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
