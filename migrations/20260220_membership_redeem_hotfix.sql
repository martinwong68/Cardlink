-- Hotfix: membership_redeem_offer should allow self redemption by member
-- Root cause:
--   membership_redeem_offer called membership_add_points(), which requires company admin.
--   When normal member redeems, function fails with: permission denied: company admin required.

BEGIN;

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
  v_new_balance integer;
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

    v_new_balance := COALESCE(v_account.points_balance, 0) - v_points_cost;

    UPDATE public.membership_accounts
    SET points_balance = v_new_balance,
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
      v_offer.company_id,
      v_account.id,
      'offer_redeem',
      -v_points_cost,
      v_new_balance,
      'company_offer',
      v_offer.id,
      'Points spent on offer redemption',
      auth.uid(),
      now()
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
