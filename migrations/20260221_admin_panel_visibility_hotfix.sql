-- Hotfix: ensure admin panel visibility path is deterministic
-- Why:
-- 1) Some environments still have legacy/duplicate company_members SELECT policies
-- 2) get_my_admin_company_ids() may be missing/outdated
--
-- This migration normalizes policy + RPC so frontend admin detection is reliable.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Stable admin-company RPC for current user
-- -----------------------------------------------------------------------------
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
    AND cm.role IN ('owner', 'admin', 'company_owner', 'company_admin', 'manager');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_admin_company_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Normalize company_members SELECT policy (drop legacy duplicates)
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_members_select_self ON public.company_members;
DROP POLICY IF EXISTS company_members_select_member ON public.company_members;

CREATE POLICY company_members_select_member
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
