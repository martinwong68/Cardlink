-- Stage-3.1: business context snapshot helper function.
-- Backward-safe migration: additive function only.
-- Rollback note:
-- 1) DROP FUNCTION IF EXISTS public.get_business_context_snapshot(uuid);

BEGIN;

CREATE OR REPLACE FUNCTION public.get_business_context_snapshot(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  user_id uuid,
  is_master_user boolean,
  active_company_id uuid,
  managed_company_ids uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_effective_user_id uuid;
  v_actor_is_master boolean := false;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_effective_user_id := COALESCE(p_user_id, v_actor_id);

  SELECT COALESCE(p.is_master_user, false)
  INTO v_actor_is_master
  FROM public.profiles p
  WHERE p.id = v_actor_id;

  IF v_effective_user_id <> v_actor_id AND NOT v_actor_is_master THEN
    RAISE EXCEPTION 'permission denied: master account required';
  END IF;

  RETURN QUERY
  WITH role_companies AS (
    SELECT DISTINCT cm.company_id
    FROM public.company_members cm
    WHERE cm.user_id = v_effective_user_id
      AND cm.status = 'active'
      AND lower(COALESCE(cm.role, '')) IN ('owner', 'admin', 'manager', 'company_owner', 'company_admin')
  ),
  creator_companies AS (
    SELECT DISTINCT c.id AS company_id
    FROM public.companies c
    WHERE c.created_by = v_effective_user_id
  ),
  managed AS (
    SELECT company_id FROM role_companies
    UNION
    SELECT company_id FROM creator_companies
  )
  SELECT
    p.id AS user_id,
    COALESCE(p.is_master_user, false) AS is_master_user,
    p.business_active_company_id AS active_company_id,
    COALESCE(array_agg(m.company_id) FILTER (WHERE m.company_id IS NOT NULL), ARRAY[]::uuid[]) AS managed_company_ids
  FROM public.profiles p
  LEFT JOIN managed m ON true
  WHERE p.id = v_effective_user_id
  GROUP BY p.id, p.is_master_user, p.business_active_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_context_snapshot(uuid) TO authenticated;

COMMIT;
