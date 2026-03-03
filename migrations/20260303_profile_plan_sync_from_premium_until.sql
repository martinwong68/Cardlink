BEGIN;

CREATE OR REPLACE FUNCTION public.sync_profile_plan_from_premium_until()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  NEW.plan := CASE
    WHEN NEW.premium_until IS NOT NULL AND NEW.premium_until > now() THEN 'premium'
    ELSE 'free'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_plan_from_premium_until ON public.profiles;
CREATE TRIGGER trg_profiles_sync_plan_from_premium_until
BEFORE INSERT OR UPDATE OF premium_until ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_plan_from_premium_until();

UPDATE public.profiles p
SET
  plan = CASE
    WHEN p.premium_until IS NOT NULL AND p.premium_until > now() THEN 'premium'
    ELSE 'free'
  END,
  updated_at = now()
WHERE p.plan IS DISTINCT FROM CASE
  WHEN p.premium_until IS NOT NULL AND p.premium_until > now() THEN 'premium'
  ELSE 'free'
END;

COMMIT;
