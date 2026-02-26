-- Runbook: apply company card company_id backfill safely in Supabase SQL Editor
-- Date: 2026-02-26
-- Purpose: Ensure company cards are visible in company performance page.

-- =====================
-- 0) Pre-check (read-only)
-- =====================
-- How many business cards still missing company_id?
SELECT count(*) AS missing_company_id_cards
FROM public.business_cards
WHERE company_id IS NULL;

-- How many of those are company profile cards?
SELECT count(*) AS missing_company_id_profile_cards
FROM public.business_cards
WHERE company_id IS NULL
  AND coalesce(is_company_profile, false) = true;

-- Preview cards that likely should be company cards by membership relation.
SELECT bc.id, bc.user_id, bc.company, bc.slug, bc.is_company_profile
FROM public.business_cards bc
WHERE bc.company_id IS NULL
ORDER BY bc.created_at DESC
LIMIT 50;

-- =====================
-- 1) Apply backfill
-- =====================
BEGIN;

-- 1) Link profile cards from companies.profile_card_id.
UPDATE public.business_cards AS bc
SET company_id = c.id
FROM public.companies AS c
WHERE bc.company_id IS NULL
  AND c.profile_card_id = bc.id;

-- 2) Link legacy profile cards by slug prefix: company-profile-{companyIdPrefix}-xxxx.
UPDATE public.business_cards AS bc
SET company_id = c.id
FROM public.companies AS c
WHERE bc.company_id IS NULL
  AND bc.is_company_profile = true
  AND bc.slug LIKE 'company-profile-%'
  AND split_part(bc.slug, '-', 3) = left(c.id::text, 8);

-- 3) Link normal cards for users who belong to exactly one active, non-banned, non-deleted company.
WITH single_company_member AS (
  SELECT
    cm.user_id,
    (array_agg(cm.company_id))[1] AS company_id
  FROM public.company_members AS cm
  JOIN public.companies AS c
    ON c.id = cm.company_id
  WHERE cm.status = 'active'
    AND coalesce(c.is_active, true) = true
    AND coalesce(c.is_banned, false) = false
    AND c.deleted_at IS NULL
  GROUP BY cm.user_id
  HAVING count(DISTINCT cm.company_id) = 1
)
UPDATE public.business_cards AS bc
SET company_id = scm.company_id
FROM single_company_member AS scm
WHERE bc.company_id IS NULL
  AND coalesce(bc.is_company_profile, false) = false
  AND bc.user_id = scm.user_id;

-- 4) Link legacy cards by exact company name match when user membership is unambiguous under active companies.
WITH name_match_candidate AS (
  SELECT
    bc.id AS card_id,
    min(cm.company_id) AS company_id,
    count(DISTINCT cm.company_id) AS matched_company_count
  FROM public.business_cards AS bc
  JOIN public.company_members AS cm
    ON cm.user_id = bc.user_id
  JOIN public.companies AS c
    ON c.id = cm.company_id
  WHERE bc.company_id IS NULL
    AND coalesce(bc.is_company_profile, false) = false
    AND cm.status = 'active'
    AND coalesce(c.is_active, true) = true
    AND coalesce(c.is_banned, false) = false
    AND c.deleted_at IS NULL
    AND nullif(trim(bc.company), '') IS NOT NULL
    AND lower(trim(bc.company)) = lower(trim(c.name))
  GROUP BY bc.id
)
UPDATE public.business_cards AS bc
SET company_id = nmc.company_id
FROM name_match_candidate AS nmc
WHERE bc.id = nmc.card_id
  AND nmc.matched_company_count = 1;

COMMIT;

-- =====================
-- 2) Post-check (read-only)
-- =====================
-- Remaining cards without company_id.
SELECT count(*) AS remaining_missing_company_id_cards
FROM public.business_cards
WHERE company_id IS NULL;

-- Remaining likely company cards (non-profile) without company_id.
SELECT count(*) AS remaining_non_profile_missing_company_id_cards
FROM public.business_cards
WHERE company_id IS NULL
  AND coalesce(is_company_profile, false) = false;

-- Sample check for one company: card counts by company_id.
SELECT c.id AS company_id, c.name, count(bc.id) AS card_count
FROM public.companies c
LEFT JOIN public.business_cards bc ON bc.company_id = c.id
GROUP BY c.id, c.name
ORDER BY card_count DESC, c.name ASC
LIMIT 30;
