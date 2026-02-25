-- Backfill legacy company cards missing company_id so they can appear in company performance lists.

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
