-- RLS / Policy cleanup pack
-- Goals:
-- 1) Reduce auth_rls_initplan warnings by using (select auth.uid()) in key policies
-- 2) Remove duplicate/conflicting permissive policies for company/membership domain
-- 3) Resolve ERROR: public.user_roles has RLS disabled (enable RLS safely if table exists)

BEGIN;

-- -----------------------------------------------------------------------------
-- A) companies: keep one public SELECT + admin write path
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select_members ON public.companies;
DROP POLICY IF EXISTS companies_select_public ON public.companies;
DROP POLICY IF EXISTS companies_insert_admin ON public.companies;
DROP POLICY IF EXISTS companies_update_admin ON public.companies;
DROP POLICY IF EXISTS companies_delete_admin ON public.companies;

CREATE POLICY companies_select_public
  ON public.companies
  FOR SELECT
  USING (is_active = true);

CREATE POLICY companies_insert_admin
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by OR created_by IS NULL);

CREATE POLICY companies_update_admin
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(id))
  WITH CHECK (public.is_company_admin(id));

CREATE POLICY companies_delete_admin
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.is_company_admin(id));

-- -----------------------------------------------------------------------------
-- B) company_members: remove duplicate SELECT policies and keep deterministic self-read
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_members_select_self ON public.company_members;
DROP POLICY IF EXISTS company_members_select_member ON public.company_members;
DROP POLICY IF EXISTS company_members_insert_admin ON public.company_members;
DROP POLICY IF EXISTS company_members_update_admin ON public.company_members;
DROP POLICY IF EXISTS company_members_delete_admin ON public.company_members;

CREATE POLICY company_members_select_member
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

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

-- -----------------------------------------------------------------------------
-- C) membership_accounts / points ledger / offer_redemptions: normalize auth.uid() usage
-- -----------------------------------------------------------------------------
ALTER TABLE public.membership_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_accounts_select_scope ON public.membership_accounts;
CREATE POLICY membership_accounts_select_scope
  ON public.membership_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_company_member(company_id)
  );

DROP POLICY IF EXISTS points_ledger_select_scope ON public.membership_points_ledger;
CREATE POLICY points_ledger_select_scope
  ON public.membership_points_ledger
  FOR SELECT
  TO authenticated
  USING (
    public.is_company_member(company_id)
    OR EXISTS (
      SELECT 1
      FROM public.membership_accounts ma
      WHERE ma.id = account_id
        AND ma.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS offer_redemptions_select_scope ON public.offer_redemptions;
CREATE POLICY offer_redemptions_select_scope
  ON public.offer_redemptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_offers co
      WHERE co.id = offer_id
        AND public.is_company_member(co.company_id)
    )
  );

DROP POLICY IF EXISTS offer_redemptions_insert_scope ON public.offer_redemptions;
CREATE POLICY offer_redemptions_insert_scope
  ON public.offer_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_offers co
      WHERE co.id = offer_id
        AND public.is_company_admin(co.company_id)
    )
  );

-- -----------------------------------------------------------------------------
-- D) user_roles: fix ERROR lint (RLS disabled in public)
-- Safe behavior: enable RLS only when table exists; grant self-read only if user_id column exists.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  has_user_roles boolean;
  has_user_id_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) INTO has_user_roles;

  IF has_user_roles THEN
    EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';

    -- clean possible legacy policy names
    EXECUTE 'DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles';
    EXECUTE 'DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles';

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_roles'
        AND column_name = 'user_id'
    ) INTO has_user_id_col;

    IF has_user_id_col THEN
      EXECUTE '
        CREATE POLICY user_roles_select_own
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (user_id = (select auth.uid()))
      ';
    END IF;
  END IF;
END $$;

COMMIT;
