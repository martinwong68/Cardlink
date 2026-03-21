-- increment_ai_actions_used: atomically increment the AI usage counter for a company.
-- If over monthly limit, deducts from purchased credit packs (oldest first).
CREATE OR REPLACE FUNCTION increment_ai_actions_used(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_used integer;
  v_limit integer;
BEGIN
  UPDATE company_subscriptions
  SET ai_actions_used = ai_actions_used + 1,
      updated_at = now()
  WHERE company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT ai_actions_used, ai_actions_limit INTO v_used, v_limit
  FROM company_subscriptions
  WHERE company_id = p_company_id;

  IF v_used > v_limit THEN
    UPDATE ai_credits
    SET credits_remaining = credits_remaining - 1
    WHERE id = (
      SELECT id FROM ai_credits
      WHERE company_id = p_company_id
        AND credits_remaining > 0
      ORDER BY purchased_at ASC NULLS LAST
      LIMIT 1
    );
  END IF;
END;
$$;

-- recompute_profile_premium: recomputes the plan/premium_until fields on profiles
-- based on the user's Stripe subscription status
CREATE OR REPLACE FUNCTION recompute_profile_premium(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_period_end timestamptz;
BEGIN
  SELECT stripe_subscription_status, stripe_subscription_current_period_end
  INTO v_status, v_period_end
  FROM profiles
  WHERE id = p_user_id;

  IF v_status IN ('active', 'trialing', 'past_due') AND v_period_end IS NOT NULL THEN
    UPDATE profiles
    SET plan = 'premium',
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
