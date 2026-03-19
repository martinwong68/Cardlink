CREATE TABLE company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ai_actions_used integer NOT NULL DEFAULT 0,
  ai_actions_limit integer NOT NULL DEFAULT 0,
  storage_used_mb integer NOT NULL DEFAULT 0,
  storage_limit_mb integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own company subscription" ON company_subscriptions
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "Users can update own company subscription" ON company_subscriptions
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM company_members WHERE user_id = auth.uid()
  ));
