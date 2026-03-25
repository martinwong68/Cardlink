-- ================================================================
-- Seed Demo Data for martinwong58@gmail.com
-- Run directly in Supabase SQL Editor.
--
-- This creates a demo company with realistic data across all
-- business modules so the user can test every feature immediately.
-- ================================================================

-- Fix company_members role constraint first (allows 'owner' role)
ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_role_check;
ALTER TABLE company_members ADD CONSTRAINT company_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'member', 'staff'));

-- Ensure business_notifications table exists (migration 010 may not have been applied)
CREATE TABLE IF NOT EXISTS business_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('new_order','low_stock','new_connection','invoice_overdue','payment_received','booking_new','ai_suggestion','system')),
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','normal','info')),
  related_module text,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_business_notifications_company ON business_notifications(company_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_business_notifications_type ON business_notifications(type);
ALTER TABLE business_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_notifications' AND policyname = 'Users can read own notifications') THEN
    CREATE POLICY "Users can read own notifications" ON business_notifications FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON business_notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_notifications' AND policyname = 'Service role can insert') THEN
    CREATE POLICY "Service role can insert" ON business_notifications FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
DECLARE
  v_user_id       uuid;
  v_company_id    uuid := gen_random_uuid();
  v_pro_plan_id   uuid;
  -- HR
  v_dept_eng      uuid := gen_random_uuid();
  v_dept_sales    uuid := gen_random_uuid();
  v_dept_ops      uuid := gen_random_uuid();
  v_pos_senior    uuid := gen_random_uuid();
  v_pos_mgr       uuid := gen_random_uuid();
  v_pos_lead      uuid := gen_random_uuid();
  v_emp_alice     uuid := gen_random_uuid();
  v_emp_bob       uuid := gen_random_uuid();
  v_emp_carol     uuid := gen_random_uuid();
  v_emp_david     uuid := gen_random_uuid();
  v_emp_eva       uuid := gen_random_uuid();
  -- Inventory
  v_cat_elec      uuid := gen_random_uuid();
  v_cat_office    uuid := gen_random_uuid();
  v_wh_main       uuid := gen_random_uuid();
  v_wh_overflow   uuid := gen_random_uuid();
  -- Booking
  v_svc_consult   uuid := gen_random_uuid();
  v_svc_checkin   uuid := gen_random_uuid();
  v_svc_workshop  uuid := gen_random_uuid();
  -- CRM
  v_lead_1        uuid := gen_random_uuid();
  v_lead_2        uuid := gen_random_uuid();
  v_contact_1     uuid := gen_random_uuid();
  v_contact_2     uuid := gen_random_uuid();
  v_contact_3     uuid := gen_random_uuid();
  v_deal_1        uuid := gen_random_uuid();
  v_deal_2        uuid := gen_random_uuid();
  -- Store
  v_store_cust_1  uuid := gen_random_uuid();
  v_store_cust_2  uuid := gen_random_uuid();
  v_store_ord_1   uuid := gen_random_uuid();
  v_store_ord_2   uuid := gen_random_uuid();
BEGIN
  -- ─── 1. Resolve user ───────────────────────────────────────
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = 'martinwong58@gmail.com'
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User martinwong58@gmail.com not found in auth.users. Sign up first.';
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- ─── 2. Ensure profile exists ──────────────────────────────
  INSERT INTO profiles (id, email, full_name, plan)
  VALUES (v_user_id, 'martinwong58@gmail.com', 'Martin Wong', 'free')
  ON CONFLICT (id) DO NOTHING;

  -- ─── 3. Create demo company ────────────────────────────────
  INSERT INTO companies (
    id, name, slug, description, business_type, email, phone, website,
    default_currency, timezone, employee_count_range, is_active, created_by,
    onboarding_completed
  ) VALUES (
    v_company_id,
    'Cardlink Demo Co',
    'cardlink-demo-' || substr(v_company_id::text, 1, 8),
    'A demo company for testing all Cardlink features',
    'llc',
    'demo@cardlink-demo.com',
    '+1-555-0100',
    'https://demo.cardlink.app',
    'USD',
    'America/New_York',
    '11-50',
    true,
    v_user_id,
    true
  );

  -- ─── 4. Add owner membership ───────────────────────────────
  INSERT INTO company_members (company_id, user_id, role, status, joined_at)
  VALUES (v_company_id, v_user_id, 'owner', 'active', now());

  -- ─── 5. Set active company on profile ──────────────────────
  UPDATE profiles
     SET business_active_company_id = v_company_id
   WHERE id = v_user_id;

  -- ─── 6. Create subscription (Professional plan) ────────────
  SELECT id INTO v_pro_plan_id
    FROM subscription_plans
   WHERE slug = 'professional' AND is_active = true
   LIMIT 1;

  IF v_pro_plan_id IS NULL THEN
    -- Fallback to starter plan
    SELECT id INTO v_pro_plan_id
      FROM subscription_plans
     WHERE slug = 'starter' AND is_active = true
     LIMIT 1;
  END IF;

  IF v_pro_plan_id IS NOT NULL THEN
    INSERT INTO company_subscriptions (
      company_id, plan_id, status,
      current_period_start, current_period_end,
      ai_actions_used, ai_actions_limit,
      storage_used_mb, storage_limit_mb
    ) VALUES (
      v_company_id, v_pro_plan_id, 'active',
      now(), now() + interval '30 days',
      12, 200,
      128, 5120
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- HR MODULE
  -- ─────────────────────────────────────────────────────────────

  -- Departments
  INSERT INTO hr_departments (id, company_id, name, description) VALUES
    (v_dept_eng,   v_company_id, 'Engineering',  'Software development & tech'),
    (v_dept_sales, v_company_id, 'Sales',        'Revenue & client acquisition'),
    (v_dept_ops,   v_company_id, 'Operations',   'Business operations & logistics');

  -- Positions
  INSERT INTO hr_positions (id, company_id, department_id, title, description) VALUES
    (v_pos_senior, v_company_id, v_dept_eng,   'Senior Developer', 'Lead developer role'),
    (v_pos_mgr,    v_company_id, v_dept_sales, 'Sales Manager',    'Manages sales team'),
    (v_pos_lead,   v_company_id, v_dept_ops,   'Operations Lead',  'Day-to-day ops management');

  -- Employees (full_name is the column, not first_name/last_name)
  INSERT INTO hr_employees (id, company_id, full_name, email, department, position, status, start_date, salary) VALUES
    (v_emp_alice, v_company_id, 'Alice Chen',      'alice@demo.com',  'Engineering',  'Senior Developer',   'active', '2024-01-15', 95000),
    (v_emp_bob,   v_company_id, 'Bob Smith',       'bob@demo.com',    'Sales',        'Sales Manager',      'active', '2023-06-01', 85000),
    (v_emp_carol, v_company_id, 'Carol Davis',     'carol@demo.com',  'Operations',   'Operations Lead',    'active', '2024-03-10', 78000),
    (v_emp_david, v_company_id, 'David Lee',       'david@demo.com',  'Engineering',  'Junior Developer',   'active', '2025-01-20', 65000),
    (v_emp_eva,   v_company_id, 'Eva Martinez',    'eva@demo.com',    'Sales',        'Sales Rep',          'inactive', '2024-08-15', 55000);

  -- Leave requests (days is required)
  INSERT INTO hr_leave_requests (company_id, employee_id, leave_type, start_date, end_date, days, status, reason) VALUES
    (v_company_id, v_emp_alice, 'annual',    (now() + interval '5 days')::date,  (now() + interval '10 days')::date, 5,  'pending',  'Family vacation'),
    (v_company_id, v_emp_bob,   'sick',      (now() - interval '3 days')::date,  (now() - interval '1 day')::date,   2,  'approved', 'Flu recovery'),
    (v_company_id, v_emp_eva,   'maternity', (now() - interval '30 days')::date, (now() + interval '60 days')::date, 90, 'approved', 'Maternity leave');

  -- Attendance (clock_in/clock_out are timestamptz)
  INSERT INTO hr_attendance (company_id, employee_id, date, clock_in, clock_out, hours_worked, status) VALUES
    (v_company_id, v_emp_alice, (now() - interval '1 day')::date, (now() - interval '1 day')::date + time '09:02', (now() - interval '1 day')::date + time '17:35', 8.55, 'present'),
    (v_company_id, v_emp_bob,   (now() - interval '1 day')::date, (now() - interval '1 day')::date + time '08:55', (now() - interval '1 day')::date + time '18:10', 9.25, 'present'),
    (v_company_id, v_emp_carol, (now() - interval '1 day')::date, (now() - interval '1 day')::date + time '09:15', (now() - interval '1 day')::date + time '17:00', 7.75, 'late'),
    (v_company_id, v_emp_david, (now() - interval '1 day')::date, (now() - interval '1 day')::date + time '09:00', (now() - interval '1 day')::date + time '17:30', 8.50, 'present');

  -- Holidays (no 'type' column, has 'recurring' boolean)
  INSERT INTO hr_holidays (company_id, name, date, recurring) VALUES
    (v_company_id, 'New Year''s Day',    '2026-01-01', true),
    (v_company_id, 'Independence Day',   '2026-07-04', true),
    (v_company_id, 'Christmas Day',      '2026-12-25', true);

  -- ─────────────────────────────────────────────────────────────
  -- INVENTORY MODULE
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO inv_categories (id, company_id, name) VALUES
    (v_cat_elec,   v_company_id, 'Electronics'),
    (v_cat_office, v_company_id, 'Office Supplies');

  INSERT INTO inv_warehouses (id, company_id, name, code, address, is_active) VALUES
    (v_wh_main,     v_company_id, 'Main Warehouse',  'WH-MAIN', 'Building A', true),
    (v_wh_overflow, v_company_id, 'Overflow Storage', 'WH-OVER', 'Building B', true);

  -- ─────────────────────────────────────────────────────────────
  -- BOOKING MODULE
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO booking_services (id, company_id, name, description, duration_minutes, price, is_active) VALUES
    (v_svc_consult,  v_company_id, 'Consultation',     'One-on-one business consultation',   60,  150, true),
    (v_svc_checkin,  v_company_id, 'Quick Check-in',   'Brief 15-minute status update',      15,    0, true),
    (v_svc_workshop, v_company_id, 'Workshop Session',  'Group workshop or training session', 120, 300, true);

  -- ─────────────────────────────────────────────────────────────
  -- CRM MODULE (tables created externally — skip if missing)
  -- ─────────────────────────────────────────────────────────────

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_leads') THEN
    -- Leads (uses: name, email, phone, source, status, notes)
    INSERT INTO crm_leads (id, company_id, name, email, phone, source, status, notes) VALUES
      (v_lead_1, v_company_id, 'TechStart Inc.',   'info@techstart.io',   '+1-555-0201', 'website',  'qualified', 'Interested in enterprise plan'),
      (v_lead_2, v_company_id, 'GreenField Corp',  'sales@greenfield.co', '+1-555-0202', 'referral', 'new',       'Referred by existing customer');
  ELSE
    RAISE NOTICE 'Skipping CRM leads — table does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_contacts') THEN
    -- Contacts (uses: name, email, phone, company_name)
    INSERT INTO crm_contacts (id, company_id, name, email, phone, company_name) VALUES
      (v_contact_1, v_company_id, 'John Doe',      'john@acme.com',       '+1-555-0301', 'Acme Corp'),
      (v_contact_2, v_company_id, 'Jane Wilson',   'jane@widget.co',      '+1-555-0302', 'Widget Co'),
      (v_contact_3, v_company_id, 'Mike Johnson',  'mike@bigcorp.com',    '+1-555-0303', 'BigCorp Ltd');
  ELSE
    RAISE NOTICE 'Skipping CRM contacts — table does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_deals') THEN
    -- Deals (uses: title, value, stage, probability, contact_id, contact_name, expected_close_date)
    INSERT INTO crm_deals (id, company_id, title, value, stage, probability, contact_id, contact_name, expected_close_date) VALUES
      (v_deal_1, v_company_id, 'Acme Enterprise Deal',    25000, 'proposal',    30, v_contact_1, 'John Doe',    (now() + interval '30 days')::date),
      (v_deal_2, v_company_id, 'Widget Annual Contract',  12000, 'negotiation', 50, v_contact_2, 'Jane Wilson', (now() + interval '15 days')::date);
  ELSE
    RAISE NOTICE 'Skipping CRM deals — table does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_activities') THEN
    -- Activities (uses: type, title, description, due_date, status, related_type, related_id)
    INSERT INTO crm_activities (company_id, type, title, description, due_date, status, related_type, related_id) VALUES
      (v_company_id, 'task', 'Follow-up call with Acme',    'Discuss pricing options and timeline',  (now() - interval '2 days')::date, 'completed', 'deal',    v_deal_1),
      (v_company_id, 'task', 'Send proposal to Widget Co',  'Prepare and send revised proposal v2',  (now() - interval '1 day')::date,  'completed', 'deal',    v_deal_2),
      (v_company_id, 'task', 'BigCorp initial meeting',     'Discovery call to assess requirements', (now() + interval '3 days')::date, 'pending',   'contact', v_contact_3);
  ELSE
    RAISE NOTICE 'Skipping CRM activities — table does not exist';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- STORE MODULE
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO store_customers (id, company_id, name, email, phone) VALUES
    (v_store_cust_1, v_company_id, 'Alice Buyer',  'alice.buyer@example.com',  '+1-555-0401'),
    (v_store_cust_2, v_company_id, 'Bob Shopper',  'bob.shopper@example.com',  '+1-555-0402');

  INSERT INTO store_orders (id, company_id, order_number, customer_id, status, payment_status, subtotal, tax_amount, total) VALUES
    (v_store_ord_1, v_company_id, 'ORD-2026-0001', v_store_cust_1, 'delivered',   'paid', 159.99, 12.80, 172.79),
    (v_store_ord_2, v_company_id, 'ORD-2026-0002', v_store_cust_2, 'processing',  'paid',  49.99,  4.00,  53.99);

  INSERT INTO store_coupons (company_id, code, name, discount_type, discount_value, is_active, usage_limit, usage_count, valid_from, valid_until) VALUES
    (v_company_id, 'WELCOME10', '10% Welcome Discount', 'percentage', 10,   true, 100, 5, now() - interval '30 days', now() + interval '60 days'),
    (v_company_id, 'SAVE20',    '$20 Off Order',        'fixed',      20.00, true, 50,  0, now(),                       now() + interval '90 days');

  -- ─────────────────────────────────────────────────────────────
  -- BILLING & CREDITS
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO billing_history (company_id, description, amount, currency, type) VALUES
    (v_company_id, 'Professional Plan — Monthly', 29, 'USD', 'subscription'),
    (v_company_id, '100 AI Credits',              5,  'USD', 'credits');

  INSERT INTO ai_credits (company_id, credits_remaining, credits_purchased) VALUES
    (v_company_id, 88, 100);

  -- ─────────────────────────────────────────────────────────────
  -- BUSINESS NOTIFICATIONS
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO business_notifications (company_id, user_id, type, title, body, is_read, priority) VALUES
    (v_company_id, v_user_id, 'system',    'Welcome to Cardlink!',   'Your demo company is ready. Explore each module from the dashboard.', false, 'info'),
    (v_company_id, v_user_id, 'low_stock', 'Low Inventory Alert',    'USB-C Cables are below reorder level (5 remaining).',                false, 'urgent');

  RAISE NOTICE '✅ Demo data seeded successfully!';
  RAISE NOTICE 'Company: Cardlink Demo Co (%)' , v_company_id;
  RAISE NOTICE 'User: martinwong58@gmail.com (%)' , v_user_id;
END $$;
