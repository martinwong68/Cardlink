-- Migration: Create company_integrations table
-- Stores third-party integration configurations per company

CREATE TABLE IF NOT EXISTS company_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, integration_key)
);

-- RLS
ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own company integrations"
  ON company_integrations FOR SELECT
  USING (company_id IN (
    SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
  ));

CREATE POLICY "Owner/admin can manage integrations"
  ON company_integrations FOR ALL
  USING (company_id IN (
    SELECT cm.company_id FROM company_members cm
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ))
  WITH CHECK (company_id IN (
    SELECT cm.company_id FROM company_members cm
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));

-- Ensure company_modules table exists (may already exist from Supabase dashboard)
CREATE TABLE IF NOT EXISTS company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  enabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, module_name)
);

ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_modules' AND policyname = 'Members can view own company modules'
  ) THEN
    EXECUTE 'CREATE POLICY "Members can view own company modules"
      ON company_modules FOR SELECT
      USING (company_id IN (
        SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()
      ))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'company_modules' AND policyname = 'Owner/admin can manage modules'
  ) THEN
    EXECUTE 'CREATE POLICY "Owner/admin can manage modules"
      ON company_modules FOR ALL
      USING (company_id IN (
        SELECT cm.company_id FROM company_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN (''owner'', ''admin'')
      ))
      WITH CHECK (company_id IN (
        SELECT cm.company_id FROM company_members cm
        WHERE cm.user_id = auth.uid() AND cm.role IN (''owner'', ''admin'')
      ))';
  END IF;
END
$$;
