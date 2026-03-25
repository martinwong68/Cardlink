-- Create approval_settings table for company-wide approval workflow configuration
CREATE TABLE IF NOT EXISTS approval_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module text NOT NULL,
  auto_approve boolean NOT NULL DEFAULT false,
  approval_threshold numeric DEFAULT 0,
  approver_role text NOT NULL DEFAULT 'owner',
  require_notes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, module)
);

-- Enable RLS
ALTER TABLE approval_settings ENABLE ROW LEVEL SECURITY;

-- Only company members can read their approval settings
CREATE POLICY "Members can read approval settings" ON approval_settings
  FOR SELECT USING (
    company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
  );

-- Only company members can insert approval settings
CREATE POLICY "Members can insert approval settings" ON approval_settings
  FOR INSERT WITH CHECK (
    company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
  );

-- Only company members can update approval settings
CREATE POLICY "Members can update approval settings" ON approval_settings
  FOR UPDATE USING (
    company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid())
  );

-- Insert default approval settings for existing companies
-- The owner can approve all requests by default
-- Note: New companies get defaults via register-company API
INSERT INTO approval_settings (company_id, module, auto_approve, approver_role)
SELECT c.id, m.module, false, 'owner'
FROM companies c
CROSS JOIN (VALUES ('procurement'), ('hr'), ('accounting'), ('inventory')) AS m(module)
WHERE NOT EXISTS (
  SELECT 1 FROM approval_settings a WHERE a.company_id = c.id AND a.module = m.module
)
ON CONFLICT (company_id, module) DO NOTHING;
