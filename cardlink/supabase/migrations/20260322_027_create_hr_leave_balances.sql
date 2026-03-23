-- Leave balances track entitlement and usage per employee per leave type per year
CREATE TABLE hr_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual','sick','unpaid','maternity','paternity','other')),
  year integer NOT NULL,
  entitlement numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  carried_over numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);
ALTER TABLE hr_leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage leave balances" ON hr_leave_balances
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
