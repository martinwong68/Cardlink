CREATE TABLE ai_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 0,
  credits_purchased integer NOT NULL DEFAULT 0,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own company credits" ON ai_credits
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
