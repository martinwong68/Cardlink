BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS nfc_premium_until timestamptz,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

CREATE TABLE IF NOT EXISTS public.billing_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  stripe_checkout_session_id text NULL,
  stripe_payment_intent_id text NULL,
  stripe_subscription_id text NULL,
  stripe_customer_id text NULL,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  mode text NULL,
  payment_status text NULL,
  amount_total bigint NULL,
  currency text NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_payment_events_select_self ON public.billing_payment_events;
CREATE POLICY billing_payment_events_select_self
  ON public.billing_payment_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.nfc_cards
  ADD COLUMN IF NOT EXISTS premium_duration_months integer,
  ADD COLUMN IF NOT EXISTS premium_grant_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS premium_granted_until timestamptz,
  ADD COLUMN IF NOT EXISTS premium_granted_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.nfc_cards
SET premium_duration_months = 36
WHERE premium_duration_months IS NULL;

ALTER TABLE public.nfc_cards
  ALTER COLUMN premium_duration_months SET DEFAULT 36,
  ALTER COLUMN premium_duration_months SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'nfc_cards_premium_duration_months_check'
  ) THEN
    ALTER TABLE public.nfc_cards
      ADD CONSTRAINT nfc_cards_premium_duration_months_check
      CHECK (premium_duration_months > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_profile_premium(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_stripe_status text;
  v_stripe_end timestamptz;
  v_nfc_end timestamptz;
  v_effective_until timestamptz;
BEGIN
  SELECT
    p.stripe_subscription_status,
    p.stripe_subscription_current_period_end,
    p.nfc_premium_until
  INTO
    v_stripe_status,
    v_stripe_end,
    v_nfc_end
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_stripe_status NOT IN ('active', 'trialing', 'past_due') THEN
    v_stripe_end := NULL;
  END IF;

  v_effective_until := GREATEST(
    COALESCE(v_stripe_end, '-infinity'::timestamptz),
    COALESCE(v_nfc_end, '-infinity'::timestamptz)
  );

  IF v_effective_until = '-infinity'::timestamptz THEN
    v_effective_until := NULL;
  END IF;

  UPDATE public.profiles p
  SET
    premium_until = v_effective_until,
    plan = CASE
      WHEN v_effective_until IS NOT NULL AND v_effective_until > now() THEN 'premium'
      ELSE 'free'
    END,
    updated_at = now()
  WHERE p.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_nfc_card_premium_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_current_nfc_until timestamptz;
  v_base_until timestamptz;
  v_next_until timestamptz;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.premium_grant_applied_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.nfc_premium_until
  INTO v_current_nfc_until
  FROM public.profiles p
  WHERE p.id = NEW.owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_base_until := GREATEST(COALESCE(v_current_nfc_until, now()), now());
  v_next_until := v_base_until + make_interval(months => NEW.premium_duration_months);

  UPDATE public.profiles p
  SET
    nfc_premium_until = v_next_until,
    updated_at = now()
  WHERE p.id = NEW.owner_id;

  PERFORM public.recompute_profile_premium(NEW.owner_id);

  NEW.premium_grant_applied_at := now();
  NEW.premium_granted_until := v_next_until;
  NEW.premium_granted_to_user_id := NEW.owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_nfc_card_premium_grant ON public.nfc_cards;
CREATE TRIGGER trg_apply_nfc_card_premium_grant
BEFORE INSERT OR UPDATE OF owner_id ON public.nfc_cards
FOR EACH ROW
WHEN (NEW.owner_id IS NOT NULL)
EXECUTE FUNCTION public.apply_nfc_card_premium_grant();

UPDATE public.nfc_cards
SET owner_id = owner_id
WHERE owner_id IS NOT NULL
  AND premium_grant_applied_at IS NULL;

UPDATE public.profiles p
SET
  premium_until = GREATEST(
    COALESCE(
      CASE
        WHEN p.stripe_subscription_status IN ('active', 'trialing', 'past_due')
          THEN p.stripe_subscription_current_period_end
        ELSE NULL
      END,
      '-infinity'::timestamptz
    ),
    COALESCE(p.nfc_premium_until, '-infinity'::timestamptz)
  ),
  plan = CASE
    WHEN GREATEST(
      COALESCE(
        CASE
          WHEN p.stripe_subscription_status IN ('active', 'trialing', 'past_due')
            THEN p.stripe_subscription_current_period_end
          ELSE NULL
        END,
        '-infinity'::timestamptz
      ),
      COALESCE(p.nfc_premium_until, '-infinity'::timestamptz)
    ) > now()
      THEN 'premium'
    ELSE 'free'
  END,
  updated_at = now();

COMMIT;
