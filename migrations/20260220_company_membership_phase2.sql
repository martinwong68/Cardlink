-- Phase 2 migration: seed data + RPC for points / discount redemption
-- Depends on: 20260220_company_membership_phase1.sql

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Seed default program per company
-- -----------------------------------------------------------------------------
INSERT INTO public.membership_programs (
  company_id,
  name,
  description,
  points_label,
  points_expiry_policy,
  points_expire_month,
  points_expire_day,
  is_active
)
SELECT
  c.id,
  'Default Membership',
  'Default loyalty program',
  'BOBO-POINT',
  'annual',
  12,
  31,
  true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.membership_programs mp
  WHERE mp.company_id = c.id
);

UPDATE public.membership_programs
SET points_label = 'BOBO-POINT',
    updated_at = now()
WHERE COALESCE(points_label, '') <> 'BOBO-POINT';

-- -----------------------------------------------------------------------------
-- 2) Seed default tiers for every program
-- -----------------------------------------------------------------------------
INSERT INTO public.membership_tiers (program_id, name, rank, annual_fee, points_multiplier, benefits, is_active)
SELECT mp.id, 'Bronze', 1, 0, 1.00, '{"welcome":"Starter tier"}'::jsonb, true
FROM public.membership_programs mp
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_tiers mt
  WHERE mt.program_id = mp.id AND mt.name = 'Bronze'
);

INSERT INTO public.membership_tiers (program_id, name, rank, annual_fee, points_multiplier, benefits, is_active)
SELECT mp.id, 'Silver', 2, 0, 1.20, '{"welcome":"Mid tier"}'::jsonb, true
FROM public.membership_programs mp
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_tiers mt
  WHERE mt.program_id = mp.id AND mt.name = 'Silver'
);

INSERT INTO public.membership_tiers (program_id, name, rank, annual_fee, points_multiplier, benefits, is_active)
SELECT mp.id, 'Gold', 3, 0, 1.50, '{"welcome":"Top tier"}'::jsonb, true
FROM public.membership_programs mp
WHERE NOT EXISTS (
  SELECT 1 FROM public.membership_tiers mt
  WHERE mt.program_id = mp.id AND mt.name = 'Gold'
);

-- -----------------------------------------------------------------------------
-- 3) RPC: add points and keep account balance in sync
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_add_points(
  p_company_id uuid,
  p_account_id uuid,
  p_points integer,
  p_event_type text,
  p_note text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS public.membership_points_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.membership_accounts;
  v_new_balance integer;
  v_ledger public.membership_points_ledger;
BEGIN
  IF p_points = 0 THEN
    RAISE EXCEPTION 'points delta must not be 0';
  END IF;

  IF NOT public.is_company_admin(p_company_id) THEN
    RAISE EXCEPTION 'permission denied: company admin required';
  END IF;

  SELECT *
  INTO v_account
  FROM public.membership_accounts ma
  WHERE ma.id = p_account_id
    AND ma.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership account not found';
  END IF;

  v_new_balance := COALESCE(v_account.points_balance, 0) + p_points;

  UPDATE public.membership_accounts
  SET points_balance = v_new_balance,
      lifetime_points = CASE
        WHEN p_points > 0 THEN COALESCE(lifetime_points, 0) + p_points
        ELSE COALESCE(lifetime_points, 0)
      END,
      updated_at = now()
  WHERE id = v_account.id;

  INSERT INTO public.membership_points_ledger (
    company_id,
    account_id,
    event_type,
    points_delta,
    balance_after,
    reference_type,
    reference_id,
    note,
    created_by,
    created_at
  )
  VALUES (
    p_company_id,
    p_account_id,
    COALESCE(NULLIF(trim(p_event_type), ''), 'manual_adjustment'),
    p_points,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_note,
    auth.uid(),
    now()
  )
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END;
$$;

GRANT EXECUTE ON FUNCTION public.membership_add_points(uuid, uuid, integer, text, text, text, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) RPC: redeem offer (optional points burn)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_redeem_offer(
  p_offer_id uuid,
  p_account_id uuid
)
RETURNS TABLE (
  redemption_id uuid,
  status text,
  points_spent integer,
  discount_applied numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.company_offers;
  v_account public.membership_accounts;
  v_now timestamptz := now();
  v_redemption_id uuid;
  v_points_cost integer := 0;
BEGIN
  SELECT *
  INTO v_offer
  FROM public.company_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found';
  END IF;

  IF v_offer.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'offer is inactive';
  END IF;

  IF v_offer.start_at IS NOT NULL AND v_now < v_offer.start_at THEN
    RAISE EXCEPTION 'offer not started';
  END IF;

  IF v_offer.end_at IS NOT NULL AND v_now > v_offer.end_at THEN
    RAISE EXCEPTION 'offer expired';
  END IF;

  SELECT *
  INTO v_account
  FROM public.membership_accounts
  WHERE id = p_account_id
    AND company_id = v_offer.company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership account not found for offer company';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_account.user_id
     AND NOT public.is_company_admin(v_offer.company_id) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  v_points_cost := COALESCE(v_offer.points_cost, 0);

  IF v_points_cost > 0 THEN
    IF COALESCE(v_account.points_balance, 0) < v_points_cost THEN
      RAISE EXCEPTION 'insufficient points';
    END IF;

    PERFORM public.membership_add_points(
      v_offer.company_id,
      v_account.id,
      -v_points_cost,
      'offer_redeem',
      'Points spent on offer redemption',
      'company_offer',
      v_offer.id
    );
  END IF;

  INSERT INTO public.offer_redemptions (
    offer_id,
    account_id,
    user_id,
    redeemed_at,
    status,
    points_spent,
    discount_applied,
    metadata
  )
  VALUES (
    v_offer.id,
    v_account.id,
    v_account.user_id,
    v_now,
    'redeemed',
    v_points_cost,
    v_offer.discount_value,
    '{}'::jsonb
  )
  RETURNING id INTO v_redemption_id;

  RETURN QUERY
  SELECT
    v_redemption_id,
    'redeemed'::text,
    v_points_cost,
    v_offer.discount_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.membership_redeem_offer(uuid, uuid) TO authenticated;

COMMIT;
