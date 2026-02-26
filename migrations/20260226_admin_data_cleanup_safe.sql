-- Safe cleanup playbook for admin-related data.
-- Run section by section in Supabase SQL editor.
-- Default behavior: preview first, then execute mutations only after review.

-- =========================================================
-- A) Preview candidates (read-only)
-- =========================================================

-- A1) business_cards missing company_id (currently the only detected integrity gap)
SELECT id, user_id, company_id, slug, company, created_at
FROM public.business_cards
WHERE company_id IS NULL
ORDER BY created_at ASC;

-- A2) duplicate active company_members (same company_id + user_id)
WITH ranked AS (
  SELECT
    company_id,
    user_id,
    status,
    created_at,
    updated_at,
    row_number() OVER (
      PARTITION BY company_id, user_id
      ORDER BY coalesce(updated_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM public.company_members
  WHERE status = 'active'
)
SELECT *
FROM ranked
WHERE rn > 1
ORDER BY company_id, user_id, rn;

-- A3) duplicate company_offers by normalized title in same company
WITH normalized AS (
  SELECT
    id,
    company_id,
    lower(trim(title)) AS title_norm,
    is_active,
    created_at,
    row_number() OVER (
      PARTITION BY company_id, lower(trim(title))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.company_offers
  WHERE nullif(trim(title), '') IS NOT NULL
)
SELECT *
FROM normalized
WHERE rn > 1
ORDER BY company_id, title_norm, rn;

-- A4) duplicate nfc_cards by nfc_uid
WITH normalized AS (
  SELECT
    id,
    nfc_uid,
    chip_serial,
    owner_id,
    linked_card_id,
    company_id,
    status,
    created_at,
    row_number() OVER (
      PARTITION BY lower(trim(nfc_uid))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.nfc_cards
  WHERE nullif(trim(nfc_uid), '') IS NOT NULL
)
SELECT *
FROM normalized
WHERE rn > 1
ORDER BY nfc_uid, rn;

-- A5) duplicate nfc_cards by chip_serial
WITH normalized AS (
  SELECT
    id,
    nfc_uid,
    chip_serial,
    owner_id,
    linked_card_id,
    company_id,
    status,
    created_at,
    row_number() OVER (
      PARTITION BY lower(trim(chip_serial))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.nfc_cards
  WHERE nullif(trim(chip_serial), '') IS NOT NULL
)
SELECT *
FROM normalized
WHERE rn > 1
ORDER BY chip_serial, rn;

-- A6) Orphan checks for admin-visible entities
SELECT bc.id AS business_card_id
FROM public.business_cards AS bc
LEFT JOIN public.profiles AS p ON p.id = bc.user_id
WHERE bc.user_id IS NOT NULL AND p.id IS NULL;

SELECT bc.id AS business_card_id
FROM public.business_cards AS bc
LEFT JOIN public.companies AS c ON c.id = bc.company_id
WHERE bc.company_id IS NOT NULL AND c.id IS NULL;

SELECT c.id AS company_id
FROM public.companies AS c
LEFT JOIN public.business_cards AS bc ON bc.id = c.profile_card_id
WHERE c.profile_card_id IS NOT NULL AND bc.id IS NULL;

SELECT n.id AS nfc_card_id
FROM public.nfc_cards AS n
LEFT JOIN public.profiles AS p ON p.id = n.owner_id
WHERE n.owner_id IS NOT NULL AND p.id IS NULL;

SELECT n.id AS nfc_card_id
FROM public.nfc_cards AS n
LEFT JOIN public.business_cards AS bc ON bc.id = n.linked_card_id
WHERE n.linked_card_id IS NOT NULL AND bc.id IS NULL;

SELECT tl.id AS nfc_tap_log_id
FROM public.nfc_tap_logs AS tl
LEFT JOIN public.nfc_cards AS n ON n.id = tl.nfc_card_id
WHERE tl.nfc_card_id IS NOT NULL AND n.id IS NULL;


-- =========================================================
-- B) Mutations (execute only after reviewing A)
-- =========================================================

BEGIN;

-- B1) Backfill legacy business_cards.company_id
-- This matches existing migration logic in 20260225_company_cards_company_id_backfill.sql.

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

-- 4) Link legacy cards by exact company name match when user membership is unambiguous.
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

-- B2) Example duplicate cleanup templates (safe no-op when no duplicates)
-- Keep newest row per logical key, remove older rows.

-- company_members: remove duplicate active links
WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY company_id, user_id
      ORDER BY coalesce(updated_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM public.company_members
  WHERE status = 'active'
)
DELETE FROM public.company_members cm
USING ranked r
WHERE cm.ctid = r.ctid
  AND r.rn > 1;

-- company_offers: remove duplicate titles within same company (keep newest)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, lower(trim(title))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.company_offers
  WHERE nullif(trim(title), '') IS NOT NULL
)
DELETE FROM public.company_offers co
USING ranked r
WHERE co.id = r.id
  AND r.rn > 1;

-- nfc_cards: remove duplicate nfc_uid (keep newest)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY lower(trim(nfc_uid))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.nfc_cards
  WHERE nullif(trim(nfc_uid), '') IS NOT NULL
)
DELETE FROM public.nfc_cards n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;

-- Optional: if preview results look wrong, ROLLBACK instead of COMMIT.
COMMIT;

-- =========================================================
-- C) Post-check
-- =========================================================
SELECT count(*) AS missing_company_id_after
FROM public.business_cards
WHERE company_id IS NULL;
