CREATE TABLE billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  type text NOT NULL CHECK (type IN ('subscription','credits','addon')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own billing" ON billing_history
  FOR SELECT USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
