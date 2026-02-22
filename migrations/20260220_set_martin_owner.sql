-- Set specific account as company owner/admin for testing
-- Target email: martinwong58@gmail.com
-- Idempotent and constraint-aware.

DO $$
DECLARE
  v_email text := 'martinwong58@gmail.com';
  v_user_id uuid;
  v_role_constraint text;
  v_owner_role text := 'owner';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users: %', v_email;
  END IF;

  SELECT pg_get_constraintdef(c.oid)
  INTO v_role_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'company_members'
    AND c.conname = 'company_members_role_check'
  LIMIT 1;

  IF v_role_constraint IS NOT NULL THEN
    IF v_role_constraint ILIKE '%''owner''%' THEN
      v_owner_role := 'owner';
    ELSIF v_role_constraint ILIKE '%''company_owner''%' THEN
      v_owner_role := 'company_owner';
    ELSIF v_role_constraint ILIKE '%''admin''%' THEN
      v_owner_role := 'admin';
    ELSIF v_role_constraint ILIKE '%''company_admin''%' THEN
      v_owner_role := 'company_admin';
    ELSE
      RAISE EXCEPTION 'No admin-like role allowed by company_members_role_check: %', v_role_constraint;
    END IF;
  END IF;

  -- Upgrade existing memberships for this user to owner/admin role
  UPDATE public.company_members
  SET role = v_owner_role,
      status = 'active',
      joined_at = COALESCE(joined_at, now()),
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Ensure ownership on BOBO test companies if they exist
  INSERT INTO public.company_members (company_id, user_id, role, status, joined_at)
  SELECT c.id, v_user_id, v_owner_role, 'active', now()
  FROM public.companies c
  WHERE c.slug IN ('bobo-fitness', 'bobo-cafe', 'bobo-beauty')
    AND NOT EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = c.id
        AND cm.user_id = v_user_id
    );

  RAISE NOTICE 'User % set as % in company memberships.', v_email, v_owner_role;
END $$;
