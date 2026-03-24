-- ============================================================
-- Migration 039: Fix audit_log table — add missing columns
-- If audit_log was created externally (e.g. Supabase dashboard)
-- without company_id or other columns, migration 037 fails at
-- the RLS policy step.  This migration repairs that scenario.
-- ============================================================

-- 1. Ensure columns exist
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS table_name text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS record_id uuid;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS old_values jsonb;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS new_values jsonb;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Create company-scoped RLS policy (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_log' AND policyname='audit_log_company') THEN
    EXECUTE 'CREATE POLICY "audit_log_company" ON audit_log USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON audit_log(company_id, module);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
