-- ================================================================
-- Fix recompute_profile_premium to preserve actual plan slug
--
-- Previously this function set plan = 'premium' for any active
-- subscription. Now it preserves the plan slug (starter,
-- professional, business) if already set, and only falls back
-- to 'free' when the subscription is inactive.
-- ================================================================

CREATE OR REPLACE FUNCTION recompute_profile_premium(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_period_end timestamptz;
  v_current_plan text;
BEGIN
  SELECT stripe_subscription_status, stripe_subscription_current_period_end, plan
  INTO v_status, v_period_end, v_current_plan
  FROM profiles
  WHERE id = p_user_id;

  IF v_status IN ('active', 'trialing', 'past_due') AND v_period_end IS NOT NULL THEN
    -- Subscription is active — keep existing plan slug if it's a valid paid plan
    -- Only set to 'starter' if plan is currently 'free' (first-time subscription)
    UPDATE profiles
    SET plan = CASE
                 WHEN v_current_plan IN ('starter', 'professional', 'business') THEN v_current_plan
                 ELSE 'starter'
               END,
        premium_until = v_period_end
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET plan = 'free',
        premium_until = NULL
    WHERE id = p_user_id;
  END IF;
END;
$$;
