-- Fix2: eliminate remaining recursion path on company_members SELECT policy
-- and provide RPC for admin-company lookup without direct table policy evaluation.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Safe helper RPC for current user's admin companies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_admin_company_ids()
RETURNS TABLE (company_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = auth.uid()
    AND COALESCE(cm.status, 'active') = 'active'
    AND cm.role IN ('owner', 'admin', 'company_owner', 'company_admin');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_admin_company_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Remove recursive SELECT policy pattern from company_members
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_members_select_member ON public.company_members;

-- Self rows only (no helper call here, so no recursion risk)
CREATE POLICY company_members_select_member
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;
