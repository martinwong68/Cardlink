-- Hotfix: resolve infinite recursion in RLS policy on public.company_members
-- Issue: policy expression on company_members called helper functions that query company_members again
-- Result: infinite recursion detected in policy evaluation.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Recreate helper functions with row_security disabled in function context
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_company_member(
  p_company_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = COALESCE(p_user_id, auth.uid())
      AND COALESCE(cm.status, 'active') = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(
  p_company_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = COALESCE(p_user_id, auth.uid())
      AND COALESCE(cm.status, 'active') = 'active'
      AND cm.role IN ('owner', 'admin', 'company_owner', 'company_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Replace company_members policies to avoid self-recursive checks
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_members_select_member ON public.company_members;
DROP POLICY IF EXISTS company_members_insert_admin ON public.company_members;
DROP POLICY IF EXISTS company_members_update_admin ON public.company_members;
DROP POLICY IF EXISTS company_members_delete_admin ON public.company_members;

-- Users can always see their own membership rows.
-- Admin/owner visibility of same company is checked via SECURITY DEFINER helper
-- that runs with row_security=off to avoid recursion.
CREATE POLICY company_members_select_member
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_admin(company_id)
  );

CREATE POLICY company_members_insert_admin
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY company_members_update_admin
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY company_members_delete_admin
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.is_company_admin(company_id));

COMMIT;
