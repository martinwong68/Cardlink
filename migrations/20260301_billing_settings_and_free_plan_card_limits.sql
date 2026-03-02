BEGIN;

CREATE TABLE IF NOT EXISTS public.app_billing_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  monthly_display_price text NOT NULL DEFAULT '9.99',
  yearly_display_price text NOT NULL DEFAULT '99',
  currency_symbol text NOT NULL DEFAULT '$',
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_billing_settings (id, monthly_display_price, yearly_display_price, currency_symbol)
VALUES (1, '9.99', '99', '$')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_billing_settings_read ON public.app_billing_settings;
CREATE POLICY app_billing_settings_read
  ON public.app_billing_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.is_free_plan_card(p_card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(p.plan, 'free') = 'free'
  FROM public.business_cards bc
  LEFT JOIN public.profiles p ON p.id = bc.user_id
  WHERE bc.id = p_card_id
  LIMIT 1;
$$;

DROP TRIGGER IF EXISTS trg_free_plan_card_fields_limit ON public.card_fields;
DROP FUNCTION IF EXISTS public.enforce_free_plan_card_fields_limit();

CREATE FUNCTION public.enforce_free_plan_card_fields_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_existing_count integer;
BEGIN
  IF NOT public.is_free_plan_card(NEW.card_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.card_fields f
  WHERE f.card_id = NEW.card_id
    AND (TG_OP = 'INSERT' OR f.id <> NEW.id);

  IF v_existing_count >= 2 THEN
    RAISE EXCEPTION 'FREE_PLAN_CONTACT_LIMIT_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_plan_card_fields_limit
BEFORE INSERT OR UPDATE ON public.card_fields
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_card_fields_limit();

DROP TRIGGER IF EXISTS trg_free_plan_card_links_limit ON public.card_links;
DROP FUNCTION IF EXISTS public.enforce_free_plan_card_links_limit();

CREATE FUNCTION public.enforce_free_plan_card_links_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_existing_count integer;
BEGIN
  IF NOT public.is_free_plan_card(NEW.card_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM public.card_links l
  WHERE l.card_id = NEW.card_id
    AND (TG_OP = 'INSERT' OR l.id <> NEW.id);

  IF v_existing_count >= 2 THEN
    RAISE EXCEPTION 'FREE_PLAN_LINK_LIMIT_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_plan_card_links_limit
BEFORE INSERT OR UPDATE ON public.card_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_card_links_limit();

DROP TRIGGER IF EXISTS trg_free_plan_no_experience ON public.card_experiences;
DROP FUNCTION IF EXISTS public.enforce_free_plan_no_experience();

CREATE FUNCTION public.enforce_free_plan_no_experience()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF public.is_free_plan_card(NEW.card_id) THEN
    RAISE EXCEPTION 'FREE_PLAN_EXPERIENCE_NOT_ALLOWED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_plan_no_experience
BEFORE INSERT OR UPDATE ON public.card_experiences
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_plan_no_experience();

WITH ranked_fields AS (
  SELECT
    f.id,
    ROW_NUMBER() OVER (
      PARTITION BY f.card_id
      ORDER BY COALESCE(f.sort_order, 2147483647), f.created_at, f.id
    ) AS rn
  FROM public.card_fields f
  JOIN public.business_cards bc ON bc.id = f.card_id
  LEFT JOIN public.profiles p ON p.id = bc.user_id
  WHERE COALESCE(p.plan, 'free') = 'free'
)
DELETE FROM public.card_fields f
USING ranked_fields rf
WHERE f.id = rf.id
  AND rf.rn > 2;

WITH ranked_links AS (
  SELECT
    l.id,
    ROW_NUMBER() OVER (
      PARTITION BY l.card_id
      ORDER BY COALESCE(l.sort_order, 2147483647), l.created_at, l.id
    ) AS rn
  FROM public.card_links l
  JOIN public.business_cards bc ON bc.id = l.card_id
  LEFT JOIN public.profiles p ON p.id = bc.user_id
  WHERE COALESCE(p.plan, 'free') = 'free'
)
DELETE FROM public.card_links l
USING ranked_links rl
WHERE l.id = rl.id
  AND rl.rn > 2;

DELETE FROM public.card_experiences ce
USING public.business_cards bc
LEFT JOIN public.profiles p ON p.id = bc.user_id
WHERE ce.card_id = bc.id
  AND COALESCE(p.plan, 'free') = 'free';

COMMIT;
