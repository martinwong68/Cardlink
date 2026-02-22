-- Client app membership spend + tier upgrade support
-- Adds:
-- 1) membership join RPC for end users
-- 2) spend transaction ledger for membership accounts
-- 3) total spend + required spend threshold fields

BEGIN;

ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS required_spend_amount numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.membership_accounts
  ADD COLUMN IF NOT EXISTS total_spend_amount numeric(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.membership_spend_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.membership_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'HKD',
  note text,
  reference_type text,
  reference_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_spend_tx_account_occurred
  ON public.membership_spend_transactions(account_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_spend_tx_company_occurred
  ON public.membership_spend_transactions(company_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_membership_spend_tx_user_occurred
  ON public.membership_spend_transactions(user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_membership_account_total_spend(
  p_account_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.membership_accounts ma
  SET total_spend_amount = COALESCE(src.total_spend, 0),
      updated_at = now()
  FROM (
    SELECT account_id, SUM(amount)::numeric(14,2) AS total_spend
    FROM public.membership_spend_transactions
    WHERE account_id = p_account_id
    GROUP BY account_id
  ) src
  WHERE ma.id = p_account_id
    AND ma.id = src.account_id;

  UPDATE public.membership_accounts ma
  SET total_spend_amount = 0,
      updated_at = now()
  WHERE ma.id = p_account_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.membership_spend_transactions mst
      WHERE mst.account_id = ma.id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_membership_spend_tx_refresh_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_membership_account_total_spend(OLD.account_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_membership_account_total_spend(NEW.account_id);

  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id THEN
    PERFORM public.refresh_membership_account_total_spend(OLD.account_id);
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_membership_spend_tx_refresh_account'
  ) THEN
    CREATE TRIGGER tr_membership_spend_tx_refresh_account
      AFTER INSERT OR UPDATE OR DELETE ON public.membership_spend_transactions
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_membership_spend_tx_refresh_account();
  END IF;
END $$;

ALTER TABLE public.membership_spend_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membership_spend_tx_select_scope ON public.membership_spend_transactions;
CREATE POLICY membership_spend_tx_select_scope
  ON public.membership_spend_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.membership_accounts ma
      WHERE ma.id = account_id
        AND ma.user_id = auth.uid()
    )
    OR public.is_company_admin(company_id)
  );

DROP POLICY IF EXISTS membership_spend_tx_insert_admin ON public.membership_spend_transactions;
CREATE POLICY membership_spend_tx_insert_admin
  ON public.membership_spend_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS membership_spend_tx_update_admin ON public.membership_spend_transactions;
CREATE POLICY membership_spend_tx_update_admin
  ON public.membership_spend_transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

DROP POLICY IF EXISTS membership_spend_tx_delete_admin ON public.membership_spend_transactions;
CREATE POLICY membership_spend_tx_delete_admin
  ON public.membership_spend_transactions
  FOR DELETE
  TO authenticated
  USING (public.is_company_admin(company_id));

CREATE OR REPLACE FUNCTION public.membership_join_company(
  p_company_id uuid
)
RETURNS TABLE (
  account_id uuid,
  company_id uuid,
  user_id uuid,
  status text,
  tier_id uuid,
  total_spend_amount numeric,
  joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program_id uuid;
  v_default_tier_id uuid;
  v_account public.membership_accounts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_company_id
      AND COALESCE(c.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'company not found or inactive';
  END IF;

  SELECT mp.id
  INTO v_program_id
  FROM public.membership_programs mp
  WHERE mp.company_id = p_company_id
    AND COALESCE(mp.is_active, true) = true
  ORDER BY mp.created_at ASC
  LIMIT 1;

  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'membership program not found';
  END IF;

  SELECT mt.id
  INTO v_default_tier_id
  FROM public.membership_tiers mt
  WHERE mt.program_id = v_program_id
    AND COALESCE(mt.is_active, true) = true
  ORDER BY mt.rank ASC, mt.created_at ASC
  LIMIT 1;

  SELECT ma.*
  INTO v_account
  FROM public.membership_accounts ma
  WHERE ma.company_id = p_company_id
    AND ma.user_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.membership_accounts ma
    SET status = 'active',
        tier_id = COALESCE(ma.tier_id, v_default_tier_id),
        updated_at = now()
    WHERE ma.id = v_account.id
    RETURNING * INTO v_account;
  ELSE
    INSERT INTO public.membership_accounts (
      company_id,
      program_id,
      user_id,
      tier_id,
      status,
      joined_at,
      total_spend_amount,
      points_balance,
      lifetime_points,
      created_at,
      updated_at
    )
    VALUES (
      p_company_id,
      v_program_id,
      v_user_id,
      v_default_tier_id,
      'active',
      now(),
      0,
      0,
      0,
      now(),
      now()
    )
    RETURNING * INTO v_account;
  END IF;

  RETURN QUERY
  SELECT
    v_account.id,
    v_account.company_id,
    v_account.user_id,
    v_account.status,
    v_account.tier_id,
    COALESCE(v_account.total_spend_amount, 0),
    v_account.joined_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.membership_join_company(uuid) TO authenticated;

COMMIT;
