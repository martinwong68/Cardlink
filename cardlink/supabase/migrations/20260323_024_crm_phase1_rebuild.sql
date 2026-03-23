-- CRM Module Phase-1 Rebuild: schema enhancements + new columns + RPC functions
-- Addresses P0 critical gaps from CRM_FEATURE_GAP_ANALYSIS.md

-- ============================================================
-- 1. Enhance crm_contacts — add address fields
-- ============================================================
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS address_postal_code text;

-- ============================================================
-- 2. Enhance crm_deals — add contact_id FK + lost_reason
-- ============================================================
ALTER TABLE crm_deals
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES crm_contacts(id),
  ADD COLUMN IF NOT EXISTS lost_reason text;

-- ============================================================
-- 3. Enhance crm_leads — ensure email & phone are tracked
--    (already exist in schema, this is a safety check)
-- ============================================================
-- email and phone already exist on crm_leads per schema reference

-- ============================================================
-- 4. Enhance crm_notes — add company_id for RLS
-- ============================================================
ALTER TABLE crm_notes
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Add RLS policy for crm_notes if not already set
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Company members can manage crm_notes'
  ) THEN
    ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Company members can manage crm_notes" ON crm_notes
      FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- 5. Create index for deal→contact FK lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact_id ON crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_company_stage ON crm_deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_status ON crm_leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company_type ON crm_activities(company_id, type);

-- ============================================================
-- 6. RPC: convert_lead_to_deal — atomic lead→deal+contact conversion
-- ============================================================
CREATE OR REPLACE FUNCTION convert_lead_to_deal(
  p_lead_id uuid,
  p_company_id uuid,
  p_user_id uuid,
  p_deal_title text DEFAULT NULL,
  p_deal_value numeric DEFAULT 0,
  p_deal_stage text DEFAULT 'discovery'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead record;
  v_contact_id uuid;
  v_deal_id uuid;
  v_existing_contact uuid;
BEGIN
  -- 1. Fetch the lead (must belong to company and not already converted)
  SELECT * INTO v_lead
    FROM crm_leads
   WHERE id = p_lead_id
     AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead not found or access denied');
  END IF;

  IF v_lead.status = 'converted' THEN
    RETURN jsonb_build_object('error', 'Lead is already converted');
  END IF;

  -- 2. Check if a contact with the same email already exists
  IF v_lead.email IS NOT NULL AND v_lead.email <> '' THEN
    SELECT id INTO v_existing_contact
      FROM crm_contacts
     WHERE company_id = p_company_id
       AND email = v_lead.email
     LIMIT 1;
  END IF;

  -- 3. Create or reuse contact
  IF v_existing_contact IS NOT NULL THEN
    v_contact_id := v_existing_contact;
  ELSE
    INSERT INTO crm_contacts (company_id, name, email, phone, notes, created_by)
    VALUES (p_company_id, v_lead.name, v_lead.email, v_lead.phone, v_lead.notes, p_user_id)
    RETURNING id INTO v_contact_id;
  END IF;

  -- 4. Create the deal
  INSERT INTO crm_deals (
    company_id, title, value, stage, probability,
    lead_id, contact_id, contact_name, created_by
  ) VALUES (
    p_company_id,
    COALESCE(NULLIF(p_deal_title, ''), v_lead.name || ' — Deal'),
    COALESCE(p_deal_value, v_lead.value, 0),
    COALESCE(p_deal_stage, 'discovery'),
    CASE WHEN COALESCE(p_deal_stage, 'discovery') = 'discovery' THEN 10
         WHEN p_deal_stage = 'proposal' THEN 30
         WHEN p_deal_stage = 'negotiation' THEN 50
         ELSE 10 END,
    p_lead_id,
    v_contact_id,
    v_lead.name,
    p_user_id
  )
  RETURNING id INTO v_deal_id;

  -- 5. Mark lead as converted
  UPDATE crm_leads
     SET status = 'converted',
         updated_at = now()
   WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deal_id', v_deal_id,
    'contact_id', v_contact_id,
    'lead_id', p_lead_id
  );
END;
$$;
