CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  ai_actions_monthly integer NOT NULL DEFAULT 0,
  max_companies integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 1,
  storage_mb integer NOT NULL DEFAULT 500,
  pdf_export boolean NOT NULL DEFAULT false,
  document_ocr_monthly integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active plans" ON subscription_plans
  FOR SELECT USING (is_active = true);
