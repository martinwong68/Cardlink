-- Phase 1 (schema-safe) migration for company + membership foundation
-- Generated based on current DB snapshot (2026-02-20)
-- Goal: extend existing companies/company_members without recreating existing tables.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Shared trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Extend existing core tables (companies / company_members)
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.company_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.company_members
SET joined_at = COALESCE(joined_at, created_at, now())
WHERE joined_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_company_members_company_user
  ON public.company_members(company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_user
  ON public.company_members(user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_role_status
  ON public.company_members(company_id, role, status);

CREATE INDEX IF NOT EXISTS idx_companies_slug
  ON public.companies(slug);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_companies_set_updated_at'
  ) THEN
    CREATE TRIGGER tr_companies_set_updated_at
      BEFORE UPDATE ON public.companies
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_company_members_set_updated_at'
  ) THEN
    CREATE TRIGGER tr_company_members_set_updated_at
      BEFORE UPDATE ON public.company_members
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Membership domain tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  points_label text NOT NULL DEFAULT 'points',
  points_expiry_policy text NOT NULL DEFAULT 'annual',
  points_expire_month smallint NOT NULL DEFAULT 12 CHECK (points_expire_month BETWEEN 1 AND 12),
  points_expire_day smallint NOT NULL DEFAULT 31 CHECK (points_expire_day BETWEEN 1 AND 31),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_membership_programs_company
  ON public.membership_programs(company_id);

CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.membership_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  rank integer NOT NULL DEFAULT 1,
  annual_fee numeric(12,2) NOT NULL DEFAULT 0,
  points_multiplier numeric(8,2) NOT NULL DEFAULT 1,
  benefits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, name)
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_program_rank
  ON public.membership_tiers(program_id, rank);

CREATE TABLE IF NOT EXISTS public.membership_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.membership_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  member_code text,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_accounts_company
  ON public.membership_accounts(company_id);

CREATE INDEX IF NOT EXISTS idx_membership_accounts_user
  ON public.membership_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_membership_accounts_program
  ON public.membership_accounts(program_id);

CREATE TABLE IF NOT EXISTS public.membership_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.membership_accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points_delta integer NOT NULL,
  balance_after integer,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_account_created
  ON public.membership_points_ledger(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_ledger_company_created
  ON public.membership_points_ledger(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  offer_type text NOT NULL DEFAULT 'discount',
  discount_type text,
  discount_value numeric(12,2),
  points_cost integer,
  start_at timestamptz,
  end_at timestamptz,
  usage_limit integer,
  per_member_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_offers_company_active
  ON public.company_offers(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_company_offers_validity
  ON public.company_offers(start_at, end_at);

CREATE TABLE IF NOT EXISTS public.offer_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.company_offers(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.membership_accounts(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'redeemed',
  points_spent integer NOT NULL DEFAULT 0,
  discount_applied numeric(12,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer
  ON public.offer_redemptions(offer_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_user
  ON public.offer_redemptions(user_id, redeemed_at DESC);

CREATE TABLE IF NOT EXISTS public.company_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_audit_logs_company_created
  ON public.company_audit_logs(company_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_membership_programs_set_updated_at') THEN
    CREATE TRIGGER tr_membership_programs_set_updated_at
      BEFORE UPDATE ON public.membership_programs
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_membership_tiers_set_updated_at') THEN
    CREATE TRIGGER tr_membership_tiers_set_updated_at
      BEFORE UPDATE ON public.membership_tiers
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_membership_accounts_set_updated_at') THEN
    CREATE TRIGGER tr_membership_accounts_set_updated_at
      BEFORE UPDATE ON public.membership_accounts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_company_offers_set_updated_at') THEN
    CREATE TRIGGER tr_company_offers_set_updated_at
      BEFORE UPDATE ON public.company_offers
      FOR EACH ROW
      EXECUTE FUNCTION public.set_current_timestamp();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4) RBAC helper functions
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
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = COALESCE(p_user_id, auth.uid())
      AND COALESCE(cm.status, 'active') = 'active'
      AND cm.role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) RLS policies for company/membership tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_select_public ON public.companies;
CREATE POLICY companies_select_public
  ON public.companies
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS companies_insert_admin ON public.companies;
CREATE POLICY companies_insert_admin
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS companies_update_admin ON public.companies;
CREATE POLICY companies_update_admin
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(id))
  WITH CHECK (public.is_company_admin(id));

DROP POLICY IF EXISTS companies_delete_admin ON public.companies;
CREATE POLICY companies_delete_admin
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.is_company_admin(id));

DROP POLICY IF EXISTS company_members_select_member ON public.company_members;
CREATE POLICY company_members_select_member
  ON public.company_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_member(company_id)
  );

DROP POLICY IF EXISTS company_members_insert_admin ON public.company_members;
CREATE POLICY company_members_insert_admin
  ON public.company_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS company_members_update_admin ON public.company_members;
CREATE POLICY company_members_update_admin
  ON public.company_members
  FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS company_members_delete_admin ON public.company_members;
CREATE POLICY company_members_delete_admin
  ON public.company_members
  FOR DELETE
  TO authenticated
  USING (public.is_company_admin(company_id));

DROP POLICY IF EXISTS membership_programs_select_member ON public.membership_programs;
CREATE POLICY membership_programs_select_member
  ON public.membership_programs
  FOR SELECT
  TO authenticated
  USING (public.is_company_member(company_id));

DROP POLICY IF EXISTS membership_programs_manage_admin ON public.membership_programs;
CREATE POLICY membership_programs_manage_admin
  ON public.membership_programs
  FOR ALL
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS membership_tiers_select_member ON public.membership_tiers;
CREATE POLICY membership_tiers_select_member
  ON public.membership_tiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.membership_programs mp
      WHERE mp.id = program_id
        AND public.is_company_member(mp.company_id)
    )
  );

DROP POLICY IF EXISTS membership_tiers_manage_admin ON public.membership_tiers;
CREATE POLICY membership_tiers_manage_admin
  ON public.membership_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.membership_programs mp
      WHERE mp.id = program_id
        AND public.is_company_admin(mp.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.membership_programs mp
      WHERE mp.id = program_id
        AND public.is_company_admin(mp.company_id)
    )
  );

DROP POLICY IF EXISTS membership_accounts_select_scope ON public.membership_accounts;
CREATE POLICY membership_accounts_select_scope
  ON public.membership_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_company_member(company_id)
  );

DROP POLICY IF EXISTS membership_accounts_manage_admin ON public.membership_accounts;
CREATE POLICY membership_accounts_manage_admin
  ON public.membership_accounts
  FOR ALL
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

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
        AND ma.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS points_ledger_insert_admin ON public.membership_points_ledger;
CREATE POLICY points_ledger_insert_admin
  ON public.membership_points_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS company_offers_select_public ON public.company_offers;
CREATE POLICY company_offers_select_public
  ON public.company_offers
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS company_offers_manage_admin ON public.company_offers;
CREATE POLICY company_offers_manage_admin
  ON public.company_offers
  FOR ALL
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS offer_redemptions_select_scope ON public.offer_redemptions;
CREATE POLICY offer_redemptions_select_scope
  ON public.offer_redemptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
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
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.company_offers co
      WHERE co.id = offer_id
        AND public.is_company_admin(co.company_id)
    )
  );

DROP POLICY IF EXISTS company_audit_logs_select_admin ON public.company_audit_logs;
CREATE POLICY company_audit_logs_select_admin
  ON public.company_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_company_admin(company_id));

DROP POLICY IF EXISTS company_audit_logs_insert_admin ON public.company_audit_logs;
CREATE POLICY company_audit_logs_insert_admin
  ON public.company_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id));

COMMIT;
