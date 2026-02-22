-- Test scenarios for membership/discount functions
-- Prerequisites:
-- 1) Run Phase 1 + Phase 2 + RLS hotfix migrations first
-- 2) This script auto-creates test users if fewer than 4 users exist

BEGIN;

DO $$
DECLARE
  u_owner_multi uuid;
  u_owner_single uuid;
  u_member uuid;
  u_other uuid;

  v_test_owner_multi_email text := 'bobo.owner.multi@test.local';
  v_test_owner_single_email text := 'bobo.owner.single@test.local';
  v_test_member_email text := 'bobo.member@test.local';
  v_test_other_email text := 'bobo.other@test.local';
  v_role_constraint text;
  v_owner_role text := 'owner';
  v_member_role text := 'member';

  c_a uuid;
  c_b uuid;
  c_c uuid;

  p_a uuid;
  p_b uuid;
  p_c uuid;

  t_a_bronze uuid;
  t_b_bronze uuid;
  t_c_bronze uuid;

  a_member_a uuid;
  a_member_b uuid;
  a_other_c uuid;

  offer_a_points uuid;
  offer_b_percent uuid;

  redeem_row record;
BEGIN
  -- ---------------------------------------------------------------------------
  -- A) Ensure at least 4 users exist in auth.users
  --    Create deterministic test users if missing.
  -- ---------------------------------------------------------------------------
  BEGIN
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_sso_user,
      is_anonymous
    )
    SELECT
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v.email,
      crypt('Passw0rd!23', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ('{"full_name":"' || v.full_name || '"}')::jsonb,
      false,
      false
    FROM (
      VALUES
        (v_test_owner_multi_email, 'BOBO Owner Multi'),
        (v_test_owner_single_email, 'BOBO Owner Single'),
        (v_test_member_email, 'BOBO Member'),
        (v_test_other_email, 'BOBO Other')
    ) AS v(email, full_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users au WHERE au.email = v.email
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Auto-create users skipped (%). Falling back to existing auth.users.', SQLERRM;
  END;

  -- Prefer deterministic test users first
  SELECT id INTO u_owner_multi FROM auth.users WHERE email = v_test_owner_multi_email;
  SELECT id INTO u_owner_single FROM auth.users WHERE email = v_test_owner_single_email;
  SELECT id INTO u_member FROM auth.users WHERE email = v_test_member_email;
  SELECT id INTO u_other FROM auth.users WHERE email = v_test_other_email;

  -- Fallback to earliest users if any test user is still missing
  IF u_owner_multi IS NULL THEN
    SELECT id INTO u_owner_multi FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 0;
  END IF;
  IF u_owner_single IS NULL THEN
    SELECT id INTO u_owner_single FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 1;
  END IF;
  IF u_member IS NULL THEN
    SELECT id INTO u_member FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 2;
  END IF;
  IF u_other IS NULL THEN
    SELECT id INTO u_other FROM auth.users ORDER BY created_at LIMIT 1 OFFSET 3;
  END IF;

  IF u_other IS NULL THEN
    RAISE EXCEPTION 'Unable to prepare 4 users in auth.users for test script. Please create 4 users and rerun.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- A2) Resolve valid role literals from check constraint dynamically
  -- ---------------------------------------------------------------------------
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
      RAISE EXCEPTION 'company_members_role_check has no admin-like role. Constraint=%', v_role_constraint;
    END IF;

    IF v_role_constraint ILIKE '%''member''%' THEN
      v_member_role := 'member';
    ELSIF v_role_constraint ILIKE '%''user''%' THEN
      v_member_role := 'user';
    ELSIF v_role_constraint ILIKE '%''customer''%' THEN
      v_member_role := 'customer';
    ELSE
      v_member_role := v_owner_role;
    END IF;
  END IF;

  RAISE NOTICE 'Using roles for test data: owner_role=%, member_role=%', v_owner_role, v_member_role;

  -- ---------------------------------------------------------------------------
  -- B) Create 3 companies (idempotent)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.companies (name, slug, is_active, created_by)
  VALUES ('BOBO Fitness', 'bobo-fitness', true, u_owner_multi)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (name, slug, is_active, created_by)
  VALUES ('BOBO Cafe', 'bobo-cafe', true, u_owner_multi)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.companies (name, slug, is_active, created_by)
  VALUES ('BOBO Beauty', 'bobo-beauty', true, u_owner_single)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO c_a FROM public.companies WHERE slug = 'bobo-fitness';
  SELECT id INTO c_b FROM public.companies WHERE slug = 'bobo-cafe';
  SELECT id INTO c_c FROM public.companies WHERE slug = 'bobo-beauty';

  -- ---------------------------------------------------------------------------
  -- C) Company members
  -- owner_multi owns A and B (one owner with >1 company)
  -- owner_single owns C
  -- member joins A and B
  -- other joins C
  -- ---------------------------------------------------------------------------
  INSERT INTO public.company_members (company_id, user_id, role, status, joined_at)
  VALUES
    (c_a, u_owner_multi, v_owner_role, 'active', now()),
    (c_b, u_owner_multi, v_owner_role, 'active', now()),
    (c_c, u_owner_single, v_owner_role, 'active', now()),
    (c_a, u_member, v_member_role, 'active', now()),
    (c_b, u_member, v_member_role, 'active', now()),
    (c_c, u_other, v_member_role, 'active', now())
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = EXCLUDED.status,
      joined_at = EXCLUDED.joined_at,
      updated_at = now();

  -- ---------------------------------------------------------------------------
  -- D) Programs and tiers (BOBO-POINT shared)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.membership_programs (
    company_id, name, points_label, points_expiry_policy, points_expire_month, points_expire_day, is_active
  )
  VALUES
    (c_a, 'Default Membership', 'BOBO-POINT', 'annual', 12, 31, true),
    (c_b, 'Default Membership', 'BOBO-POINT', 'annual', 12, 31, true),
    (c_c, 'Default Membership', 'BOBO-POINT', 'annual', 12, 31, true)
  ON CONFLICT (company_id, name) DO UPDATE
  SET points_label = 'BOBO-POINT',
      is_active = true,
      updated_at = now();

  SELECT id INTO p_a FROM public.membership_programs WHERE company_id = c_a AND name = 'Default Membership';
  SELECT id INTO p_b FROM public.membership_programs WHERE company_id = c_b AND name = 'Default Membership';
  SELECT id INTO p_c FROM public.membership_programs WHERE company_id = c_c AND name = 'Default Membership';

  INSERT INTO public.membership_tiers (program_id, name, rank, points_multiplier, is_active)
  VALUES
    (p_a, 'Bronze', 1, 1.00, true),
    (p_b, 'Bronze', 1, 1.00, true),
    (p_c, 'Bronze', 1, 1.00, true)
  ON CONFLICT (program_id, name) DO UPDATE
  SET is_active = true,
      updated_at = now();

  SELECT id INTO t_a_bronze FROM public.membership_tiers WHERE program_id = p_a AND name = 'Bronze';
  SELECT id INTO t_b_bronze FROM public.membership_tiers WHERE program_id = p_b AND name = 'Bronze';
  SELECT id INTO t_c_bronze FROM public.membership_tiers WHERE program_id = p_c AND name = 'Bronze';

  -- ---------------------------------------------------------------------------
  -- E) Membership accounts
  -- ---------------------------------------------------------------------------
  INSERT INTO public.membership_accounts (
    company_id, program_id, user_id, tier_id, status, points_balance, lifetime_points, joined_at
  )
  VALUES
    (c_a, p_a, u_member, t_a_bronze, 'active', 0, 0, now()),
    (c_b, p_b, u_member, t_b_bronze, 'active', 0, 0, now()),
    (c_c, p_c, u_other, t_c_bronze, 'active', 0, 0, now())
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET program_id = EXCLUDED.program_id,
      tier_id = EXCLUDED.tier_id,
      status = 'active',
      updated_at = now();

  SELECT id INTO a_member_a FROM public.membership_accounts WHERE company_id = c_a AND user_id = u_member;
  SELECT id INTO a_member_b FROM public.membership_accounts WHERE company_id = c_b AND user_id = u_member;
  SELECT id INTO a_other_c FROM public.membership_accounts WHERE company_id = c_c AND user_id = u_other;

  -- ---------------------------------------------------------------------------
  -- F) Offers (one points offer + one percentage offer)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.company_offers (
    company_id, title, offer_type, discount_type, discount_value, points_cost, is_active, start_at, end_at, created_by
  )
  VALUES
    (c_a, 'Protein Shake 1-for-1', 'discount', 'points', NULL, 120, true, now() - interval '1 day', now() + interval '30 days', u_owner_multi),
    (c_b, 'Coffee 20% OFF', 'discount', 'percentage', 20, 0, true, now() - interval '1 day', now() + interval '30 days', u_owner_multi)
  ON CONFLICT DO NOTHING;

  SELECT id INTO offer_a_points
  FROM public.company_offers
  WHERE company_id = c_a AND title = 'Protein Shake 1-for-1'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT id INTO offer_b_percent
  FROM public.company_offers
  WHERE company_id = c_b AND title = 'Coffee 20% OFF'
  ORDER BY created_at DESC
  LIMIT 1;

  -- ---------------------------------------------------------------------------
  -- G) Function tests
  -- ---------------------------------------------------------------------------

  -- G1: owner_multi adds points to member in company A (should pass)
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', u_owner_multi::text, true);

  PERFORM public.membership_add_points(
    c_a,
    a_member_a,
    200,
    'manual_credit',
    'Test credit by multi-company owner',
    'test',
    NULL
  );

  RAISE NOTICE 'PASS: owner_multi can add points in owned company A';

  -- G2: owner_multi adds points to company C (not owned, should fail)
  BEGIN
    PERFORM public.membership_add_points(
      c_c,
      a_other_c,
      100,
      'manual_credit',
      'Should fail: not owner of company C',
      'test',
      NULL
    );
    RAISE EXCEPTION 'FAIL: expected permission error for owner_multi on company C';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: unauthorized add_points blocked as expected (%).', SQLERRM;
  END;

  -- G3: member requests redemption in company A (pending)
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);

  SELECT * INTO redeem_row
  FROM public.membership_request_redeem_offer(offer_a_points, a_member_a)
  LIMIT 1;

  RAISE NOTICE 'PASS: redeem request success. redemption_id=%, status=%', redeem_row.redemption_id, redeem_row.status;

  -- G4: owner confirms request (should pass and deduct points)
  PERFORM set_config('request.jwt.claim.sub', u_owner_multi::text, true);

  PERFORM *
  FROM public.company_confirm_redemption(
    redeem_row.redemption_id,
    true,
    NULL
  );

  RAISE NOTICE 'PASS: owner confirmed redemption id=%', redeem_row.redemption_id;

  -- G5: member tries to request same points offer repeatedly until insufficient points
  PERFORM set_config('request.jwt.claim.sub', u_member::text, true);

  BEGIN
    LOOP
      PERFORM * FROM public.membership_request_redeem_offer(offer_a_points, a_member_a);
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: insufficient points reached as expected (%).', SQLERRM;
  END;

  -- G6: member tries to redeem using another user account (should fail)
  BEGIN
    PERFORM * FROM public.membership_request_redeem_offer(offer_a_points, a_other_c);
    RAISE EXCEPTION 'FAIL: expected permission denied when member redeems with another account';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASS: cross-account redeem blocked as expected (%).', SQLERRM;
  END;

END $$;

-- -----------------------------------------------------------------------------
-- H) Verification output
-- -----------------------------------------------------------------------------
SELECT
  c.name AS company,
  mp.points_label,
  ma.user_id,
  ma.points_balance,
  ma.lifetime_points,
  ma.status
FROM public.membership_accounts ma
JOIN public.companies c ON c.id = ma.company_id
JOIN public.membership_programs mp ON mp.id = ma.program_id
WHERE c.slug IN ('bobo-fitness', 'bobo-cafe', 'bobo-beauty')
ORDER BY c.name, ma.user_id;

SELECT
  c.name AS company,
  co.title,
  co.discount_type,
  co.discount_value,
  co.points_cost,
  co.is_active
FROM public.company_offers co
JOIN public.companies c ON c.id = co.company_id
WHERE c.slug IN ('bobo-fitness', 'bobo-cafe', 'bobo-beauty')
ORDER BY c.name, co.created_at DESC;

SELECT
  c.name AS company,
  ma.user_id,
  l.event_type,
  l.points_delta,
  l.balance_after,
  l.created_at
FROM public.membership_points_ledger l
JOIN public.membership_accounts ma ON ma.id = l.account_id
JOIN public.companies c ON c.id = ma.company_id
WHERE c.slug IN ('bobo-fitness', 'bobo-cafe', 'bobo-beauty')
ORDER BY l.created_at DESC
LIMIT 30;

COMMIT;
