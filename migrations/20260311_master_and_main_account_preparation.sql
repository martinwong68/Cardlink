-- Stage-2 preparation: master account marker and business main-account selector.
-- Backward-safe migration: additive columns only.
-- Rollback note:
-- 1) ALTER TABLE public.profiles DROP COLUMN IF EXISTS business_active_company_id;
-- 2) ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_master_user;

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_master_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_active_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_business_active_company_id
  ON public.profiles(business_active_company_id)
  WHERE business_active_company_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.is_master_user IS
  'Platform-level master user flag for founder/global management access.';

COMMENT ON COLUMN public.profiles.business_active_company_id IS
  'Current business context company selected by user for Business App operations.';

COMMIT;
