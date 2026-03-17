-- Stage-4 migration: CRM, POS full, Owner, Procurement extended tables.
-- Backward-safe: additive only. All tables use company_id + RLS via can_manage_company().
-- Run via Supabase SQL Editor or supabase db push.

BEGIN;

-- ============================================================
-- CRM MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  source text DEFAULT 'manual',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  assigned_to uuid REFERENCES auth.users(id),
  value numeric(14,2) DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_company_status ON public.crm_leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_company_created ON public.crm_leads(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  value numeric(14,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'discovery' CHECK (stage IN ('discovery','proposal','negotiation','closed_won','closed_lost')),
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  contact_name text,
  assigned_to uuid REFERENCES auth.users(id),
  expected_close_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_company_stage ON public.crm_deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_company_created ON public.crm_deals(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company_name text,
  position text,
  tags text[] DEFAULT '{}',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_company_created ON public.crm_contacts(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'task' CHECK (type IN ('call','email','meeting','task','note')),
  title text NOT NULL,
  description text,
  due_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  related_type text CHECK (related_type IN ('lead','deal','contact')),
  related_id uuid,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_company_status ON public.crm_activities(company_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company_due ON public.crm_activities(company_id, due_date);

CREATE TABLE IF NOT EXISTS public.crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'email' CHECK (type IN ('email','sms','social','ads','event','other')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  budget numeric(14,2) DEFAULT 0,
  spent numeric(14,2) DEFAULT 0,
  sent integer DEFAULT 0,
  opened integer DEFAULT 0,
  clicked integer DEFAULT 0,
  converted integer DEFAULT 0,
  start_date date,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_company_status ON public.crm_campaigns(company_id, status);

-- ============================================================
-- POS MODULE (extends existing pos_payment_* tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pos_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_registers_company ON public.pos_registers(company_id);

CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  barcode text,
  category text,
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost numeric(14,2) DEFAULT 0 CHECK (cost >= 0),
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  inv_product_id uuid REFERENCES public.inv_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_pos_products_company_category ON public.pos_products(company_id, category);
CREATE INDEX IF NOT EXISTS idx_pos_products_company_active ON public.pos_products(company_id, is_active);

CREATE TABLE IF NOT EXISTS public.pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  register_id uuid REFERENCES public.pos_registers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_cash numeric(14,2) NOT NULL DEFAULT 0,
  closing_cash numeric(14,2),
  expected_cash numeric(14,2),
  variance numeric(14,2),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_shifts_company_status ON public.pos_shifts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_company_user ON public.pos_shifts(company_id, user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled','refunded')),
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,4) DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','card','wallet','other')),
  shift_id uuid REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
  customer_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_pos_orders_company_status ON public.pos_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_company_created ON public.pos_orders(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pos_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON public.pos_order_items(order_id);

-- ============================================================
-- PROCUREMENT EXTENDED
-- ============================================================

CREATE TABLE IF NOT EXISTS public.proc_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pr_number text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  total_estimated numeric(14,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, pr_number)
);

CREATE INDEX IF NOT EXISTS idx_proc_purchase_requests_company_status ON public.proc_purchase_requests(company_id, status);

CREATE TABLE IF NOT EXISTS public.proc_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.proc_suppliers(id) ON DELETE SET NULL,
  title text NOT NULL,
  contract_number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','expired','terminated')),
  start_date date,
  end_date date,
  value numeric(14,2) DEFAULT 0,
  terms text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_proc_contracts_company_status ON public.proc_contracts(company_id, status);

-- ============================================================
-- OWNER / ADMIN MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name text NOT NULL CHECK (module_name IN ('accounting','pos','procurement','crm','inventory','cards','membership','client')),
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  enabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_company ON public.company_modules(company_id);

CREATE TABLE IF NOT EXISTS public.company_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  two_factor_required boolean NOT NULL DEFAULT false,
  password_expiry_days integer DEFAULT 0,
  session_timeout_minutes integer DEFAULT 0,
  ip_whitelist_enabled boolean NOT NULL DEFAULT false,
  ip_whitelist text[] DEFAULT '{}',
  login_alerts_enabled boolean NOT NULL DEFAULT false,
  audit_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_company_api_keys_company ON public.company_api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_company_api_keys_prefix ON public.company_api_keys(key_prefix);

-- ============================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — company isolation via can_manage_company()
-- ============================================================

-- CRM Leads
DROP POLICY IF EXISTS crm_leads_read ON public.crm_leads;
CREATE POLICY crm_leads_read ON public.crm_leads FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS crm_leads_write ON public.crm_leads;
CREATE POLICY crm_leads_write ON public.crm_leads FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- CRM Deals
DROP POLICY IF EXISTS crm_deals_read ON public.crm_deals;
CREATE POLICY crm_deals_read ON public.crm_deals FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS crm_deals_write ON public.crm_deals;
CREATE POLICY crm_deals_write ON public.crm_deals FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- CRM Contacts
DROP POLICY IF EXISTS crm_contacts_read ON public.crm_contacts;
CREATE POLICY crm_contacts_read ON public.crm_contacts FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS crm_contacts_write ON public.crm_contacts;
CREATE POLICY crm_contacts_write ON public.crm_contacts FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- CRM Activities
DROP POLICY IF EXISTS crm_activities_read ON public.crm_activities;
CREATE POLICY crm_activities_read ON public.crm_activities FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS crm_activities_write ON public.crm_activities;
CREATE POLICY crm_activities_write ON public.crm_activities FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- CRM Campaigns
DROP POLICY IF EXISTS crm_campaigns_read ON public.crm_campaigns;
CREATE POLICY crm_campaigns_read ON public.crm_campaigns FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS crm_campaigns_write ON public.crm_campaigns;
CREATE POLICY crm_campaigns_write ON public.crm_campaigns FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- POS Registers
DROP POLICY IF EXISTS pos_registers_read ON public.pos_registers;
CREATE POLICY pos_registers_read ON public.pos_registers FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_registers_write ON public.pos_registers;
CREATE POLICY pos_registers_write ON public.pos_registers FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- POS Products
DROP POLICY IF EXISTS pos_products_read ON public.pos_products;
CREATE POLICY pos_products_read ON public.pos_products FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_products_write ON public.pos_products;
CREATE POLICY pos_products_write ON public.pos_products FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- POS Shifts
DROP POLICY IF EXISTS pos_shifts_read ON public.pos_shifts;
CREATE POLICY pos_shifts_read ON public.pos_shifts FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_shifts_write ON public.pos_shifts;
CREATE POLICY pos_shifts_write ON public.pos_shifts FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- POS Orders
DROP POLICY IF EXISTS pos_orders_read ON public.pos_orders;
CREATE POLICY pos_orders_read ON public.pos_orders FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS pos_orders_write ON public.pos_orders;
CREATE POLICY pos_orders_write ON public.pos_orders FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- POS Order Items (via parent order)
DROP POLICY IF EXISTS pos_order_items_read ON public.pos_order_items;
CREATE POLICY pos_order_items_read ON public.pos_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pos_orders o WHERE o.id = order_id AND public.can_manage_company(o.company_id))
);
DROP POLICY IF EXISTS pos_order_items_write ON public.pos_order_items;
CREATE POLICY pos_order_items_write ON public.pos_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pos_orders o WHERE o.id = order_id AND public.can_manage_company(o.company_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.pos_orders o WHERE o.id = order_id AND public.can_manage_company(o.company_id))
);

-- Procurement Purchase Requests
DROP POLICY IF EXISTS proc_purchase_requests_read ON public.proc_purchase_requests;
CREATE POLICY proc_purchase_requests_read ON public.proc_purchase_requests FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_purchase_requests_write ON public.proc_purchase_requests;
CREATE POLICY proc_purchase_requests_write ON public.proc_purchase_requests FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- Procurement Contracts
DROP POLICY IF EXISTS proc_contracts_read ON public.proc_contracts;
CREATE POLICY proc_contracts_read ON public.proc_contracts FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS proc_contracts_write ON public.proc_contracts;
CREATE POLICY proc_contracts_write ON public.proc_contracts FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- Company Modules
DROP POLICY IF EXISTS company_modules_read ON public.company_modules;
CREATE POLICY company_modules_read ON public.company_modules FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS company_modules_write ON public.company_modules;
CREATE POLICY company_modules_write ON public.company_modules FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- Company Security Settings
DROP POLICY IF EXISTS company_security_settings_read ON public.company_security_settings;
CREATE POLICY company_security_settings_read ON public.company_security_settings FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS company_security_settings_write ON public.company_security_settings;
CREATE POLICY company_security_settings_write ON public.company_security_settings FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- Company API Keys
DROP POLICY IF EXISTS company_api_keys_read ON public.company_api_keys;
CREATE POLICY company_api_keys_read ON public.company_api_keys FOR SELECT USING (public.can_manage_company(company_id));
DROP POLICY IF EXISTS company_api_keys_write ON public.company_api_keys;
CREATE POLICY company_api_keys_write ON public.company_api_keys FOR ALL USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

COMMIT;
