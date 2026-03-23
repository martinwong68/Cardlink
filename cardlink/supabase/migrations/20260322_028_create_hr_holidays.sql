-- Company-level public holidays calendar
CREATE TABLE hr_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hr_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage holidays" ON hr_holidays
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
CREATE UNIQUE INDEX hr_holidays_company_date ON hr_holidays(company_id, date);
