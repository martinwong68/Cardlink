-- Hotfix: resolve "column reference company_id is ambiguous" in membership_join_company RPC
-- Apply this if 20260222_client_membership_spend_tier_support.sql was already executed.

BEGIN;

DROP FUNCTION IF EXISTS public.membership_join_company(uuid);

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
