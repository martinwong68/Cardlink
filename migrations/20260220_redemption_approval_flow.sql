-- Add redemption approval flow for company admin panel
-- Member submits redemption request -> company admin confirms/rejects

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Extend offer_redemptions for approval workflow
-- -----------------------------------------------------------------------------
ALTER TABLE public.offer_redemptions
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

-- -----------------------------------------------------------------------------
-- 2) Member requests redemption (pending)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_request_redeem_offer(
  p_offer_id uuid,
  p_account_id uuid
)
RETURNS TABLE (
  redemption_id uuid,
  status text,
  points_required integer,
  discount_value numeric
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
  v_points_required integer := 0;
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

  v_points_required := COALESCE(v_offer.points_cost, 0);

  IF v_points_required > 0 AND COALESCE(v_account.points_balance, 0) < v_points_required THEN
    RAISE EXCEPTION 'insufficient points';
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
    'pending',
    v_points_required,
    v_offer.discount_value,
    '{}'::jsonb
  )
  RETURNING id INTO v_redemption_id;

  RETURN QUERY
  SELECT
    v_redemption_id,
    'pending'::text,
    v_points_required,
    v_offer.discount_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.membership_request_redeem_offer(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Company admin confirms/rejects redemption
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.company_confirm_redemption(
  p_redemption_id uuid,
  p_approve boolean DEFAULT true,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  redemption_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_red public.offer_redemptions;
  v_offer public.company_offers;
BEGIN
  SELECT *
  INTO v_red
  FROM public.offer_redemptions
  WHERE id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'redemption not found';
  END IF;

  IF COALESCE(v_red.status, '') <> 'pending' THEN
    RAISE EXCEPTION 'redemption already processed';
  END IF;

  SELECT *
  INTO v_offer
  FROM public.company_offers
  WHERE id = v_red.offer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found for redemption';
  END IF;

  IF NOT public.is_company_admin(v_offer.company_id) THEN
    RAISE EXCEPTION 'permission denied: company admin required';
  END IF;

  IF p_approve THEN
    IF COALESCE(v_red.points_spent, 0) > 0 THEN
      PERFORM public.membership_add_points(
        v_offer.company_id,
        v_red.account_id,
        -v_red.points_spent,
        'offer_redeem_confirmed',
        'Points deducted after company approval',
        'offer_redemption',
        v_red.id
      );
    END IF;

    UPDATE public.offer_redemptions
    SET status = 'confirmed',
        confirmed_by = auth.uid(),
        confirmed_at = now(),
        reject_reason = NULL
    WHERE id = v_red.id;

    RETURN QUERY SELECT v_red.id, 'confirmed'::text;
  ELSE
    UPDATE public.offer_redemptions
    SET status = 'rejected',
        confirmed_by = auth.uid(),
        confirmed_at = now(),
        reject_reason = COALESCE(NULLIF(trim(p_reason), ''), 'Rejected by company admin')
    WHERE id = v_red.id;

    RETURN QUERY SELECT v_red.id, 'rejected'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.company_confirm_redemption(uuid, boolean, text) TO authenticated;

COMMIT;
