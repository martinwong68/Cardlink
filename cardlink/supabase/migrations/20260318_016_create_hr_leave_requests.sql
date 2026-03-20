CREATE TABLE hr_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('annual','sick','unpaid','maternity','other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage leave" ON hr_leave_requests
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
