-- ============================================================
-- Migration 040: Fix pos_daily_summaries table — add missing columns
-- If pos_daily_summaries was created externally (e.g. Supabase
-- dashboard) without summary_date or other columns, migration
-- 037 fails at the UNIQUE constraint / index step.
-- This migration repairs that scenario.
-- ============================================================

-- 1. Ensure columns exist
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS register_id uuid;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS summary_date date;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS total_sales numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS total_refunds numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS net_sales numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS total_orders int DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS total_refund_orders int DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS cash_total numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS card_total numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS other_total numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS tax_collected numeric(15,2) DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS loyalty_points_issued int DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS loyalty_points_redeemed int DEFAULT 0;
ALTER TABLE pos_daily_summaries ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Enable RLS
ALTER TABLE pos_daily_summaries ENABLE ROW LEVEL SECURITY;

-- 3. Create company-scoped RLS policy (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pos_daily_summaries' AND policyname='pos_daily_summaries_company') THEN
    EXECUTE 'CREATE POLICY "pos_daily_summaries_company" ON pos_daily_summaries USING (company_id IN (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = auth.uid()))';
  END IF;
END $$;

-- 4. Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pos_daily_summary ON pos_daily_summaries(company_id, summary_date);
