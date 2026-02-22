-- One-time backfill: map legacy company-profile-* cards to company-linked profile cards
-- Run this AFTER 20260222_company_cards_account_mother_card_support.sql

BEGIN;

-- 1) Find legacy profile cards by slug pattern and materialize for reuse
CREATE TEMP TABLE tmp_company_profile_matched ON COMMIT DROP AS
SELECT
  bc.id AS card_id,
  bc.slug,
  bc.created_at,
  c.id AS company_id,
  ROW_NUMBER() OVER (
    PARTITION BY c.id
    ORDER BY bc.created_at DESC, bc.id DESC
  ) AS row_num
FROM public.business_cards bc
JOIN public.companies c
  ON split_part(COALESCE(bc.slug, ''), '-', 3) = left(c.id::text, 8)
WHERE COALESCE(bc.slug, '') LIKE 'company-profile-%';

CREATE TEMP TABLE tmp_company_profile_chosen ON COMMIT DROP AS
SELECT company_id, card_id, slug
FROM tmp_company_profile_matched
WHERE row_num = 1;

-- 2) Mark all matched legacy cards as company profile cards with company linkage
UPDATE public.business_cards bc
SET
  company_id = m.company_id,
  is_company_profile = true,
  full_name = NULL,
  updated_at = now()
FROM tmp_company_profile_matched m
WHERE bc.id = m.card_id;

-- 3) Set canonical company profile card pointer on companies table
UPDATE public.companies c
SET
  profile_card_id = ch.card_id,
  profile_card_slug = ch.slug,
  updated_at = now()
FROM tmp_company_profile_chosen ch
WHERE c.id = ch.company_id;

COMMIT;
