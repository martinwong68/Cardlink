-- Support company-cards account creation + mother card editing
-- Safe/idempotent migration

BEGIN;

-- 1) Company fields used by mother card panel
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS profile_card_id uuid REFERENCES public.business_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profile_card_slug text;

-- 1.1) Company linkage fields on business cards
ALTER TABLE public.business_cards
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_company_profile boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_business_cards_company_profile
  ON public.business_cards(company_id, is_company_profile);

CREATE UNIQUE INDEX IF NOT EXISTS ux_companies_profile_card_slug
  ON public.companies(profile_card_slug)
  WHERE profile_card_slug IS NOT NULL;

-- 2) Ensure company member upsert key exists
CREATE UNIQUE INDEX IF NOT EXISTS ux_company_members_company_user
  ON public.company_members(company_id, user_id);

-- 3) Keep admin-company lookup RPC aligned with owner/admin/manager roles
CREATE OR REPLACE FUNCTION public.get_my_admin_company_ids()
RETURNS TABLE (company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT DISTINCT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = (SELECT auth.uid())
    AND COALESCE(cm.status, 'active') = 'active'
    AND cm.role IN ('owner', 'admin', 'manager', 'company_owner', 'company_admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_admin_company_ids() TO authenticated;

COMMIT;
