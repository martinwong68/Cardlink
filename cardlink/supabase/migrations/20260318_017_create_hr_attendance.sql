CREATE TABLE hr_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  hours_worked numeric,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);
ALTER TABLE hr_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage attendance" ON hr_attendance
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
