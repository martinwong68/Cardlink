-- AI Agent Module: Setup Uploads + Business Reviews
-- Migration: 20260323_031_ai_agent_tables.sql

-- ── ai_setup_uploads ──
-- Tracks files uploaded through the Setup Agent for onboarding.
CREATE TABLE IF NOT EXISTS ai_setup_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  document_type text,          -- detected type: inventory_products, accounting_accounts, etc.
  target_module text,          -- inventory, accounting, hr, crm, pos, company
  ai_response text,            -- raw AI response with parsed data
  status text NOT NULL DEFAULT 'preview',  -- preview, applied, failed, cancelled
  applied_count integer DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_setup_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_setup_uploads_company" ON ai_setup_uploads
  USING (company_id IN (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
  ));

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_setup_uploads_company
  ON ai_setup_uploads(company_id, created_at DESC);

-- ── ai_business_reviews ──
-- Stores periodic business review results from the Review Agent.
CREATE TABLE IF NOT EXISTS ai_business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  review_type text NOT NULL CHECK (review_type IN ('daily', 'monthly', 'annual')),
  ai_response text,            -- raw AI response with the review report
  status text NOT NULL DEFAULT 'pending',  -- pending, completed, failed
  triggered_by text DEFAULT 'user',        -- user, cron
  overall_health text,         -- good, warning, critical (extracted from report)
  score integer,               -- 0-100 (extracted from report)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_business_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_business_reviews_company" ON ai_business_reviews
  USING (company_id IN (
    SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_business_reviews_company
  ON ai_business_reviews(company_id, review_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_business_reviews_status
  ON ai_business_reviews(status) WHERE status = 'pending';

-- ── Add context column to ai_conversations for agent mode ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_conversations' AND column_name = 'agent_mode'
  ) THEN
    ALTER TABLE ai_conversations ADD COLUMN agent_mode text DEFAULT 'chat';
  END IF;
END $$;

COMMENT ON COLUMN ai_conversations.agent_mode IS 'Agent mode: chat, setup, operations, review';
