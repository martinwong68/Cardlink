-- Stage-4 accounting-first core migration.
-- Additive and rollback-safe by dropping this file objects in reverse order.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  tax_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.can_read_accounting_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_master_user = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = target_org_id
      AND c.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = target_org_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_accounting_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_master_user = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = target_org_id
      AND c.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = target_org_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND lower(coalesce(cm.role, '')) IN ('owner', 'admin', 'manager', 'company_owner', 'company_admin', 'accountant', 'bookkeeper', 'finance')
  );
$$;

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text,
  reference_number text,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
  created_by uuid,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.transaction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  currency text NOT NULL DEFAULT 'USD',
  exchange_rate numeric(14,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  description text,
  CHECK (
    (debit > 0 AND credit = 0)
    OR (credit > 0 AND debit = 0)
  )
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  type text NOT NULL CHECK (type IN ('customer', 'vendor', 'employee')),
  address text,
  tax_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate numeric(7,4) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  region text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  exchange_rate numeric(14,6) NOT NULL CHECK (exchange_rate > 0),
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  issue_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  total numeric(14,2) NOT NULL CHECK (total >= 0),
  tax numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  currency text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  related_type text,
  related_id uuid,
  file_url text NOT NULL,
  ocr_text text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_salary numeric(14,2) NOT NULL CHECK (gross_salary >= 0),
  deductions numeric(14,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net_salary numeric(14,2) NOT NULL CHECK (net_salary >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  encrypted_bank_details text,
  encrypted_salary_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, sku)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON public.accounts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON public.transactions(org_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_tx ON public.transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_dates ON public.invoices(org_id, issue_date DESC, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_type ON public.contacts(org_id, type);
CREATE INDEX IF NOT EXISTS idx_documents_org_created ON public.documents(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_org_period ON public.payroll_records(org_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON public.inventory_items(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON public.audit_log(org_id, created_at DESC);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
FOR SELECT USING (public.can_read_accounting_org(id));

DROP POLICY IF EXISTS organizations_write ON public.organizations;
CREATE POLICY organizations_write ON public.organizations
FOR ALL USING (public.can_write_accounting_org(id))
WITH CHECK (public.can_write_accounting_org(id));

DROP POLICY IF EXISTS accounts_read ON public.accounts;
CREATE POLICY accounts_read ON public.accounts
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS accounts_write ON public.accounts;
CREATE POLICY accounts_write ON public.accounts
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS transactions_read ON public.transactions;
CREATE POLICY transactions_read ON public.transactions
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS transactions_write ON public.transactions;
CREATE POLICY transactions_write ON public.transactions
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS transaction_lines_read ON public.transaction_lines;
CREATE POLICY transaction_lines_read ON public.transaction_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_id
      AND public.can_read_accounting_org(t.org_id)
  )
);

DROP POLICY IF EXISTS transaction_lines_write ON public.transaction_lines;
CREATE POLICY transaction_lines_write ON public.transaction_lines
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_id
      AND public.can_write_accounting_org(t.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_id
      AND public.can_write_accounting_org(t.org_id)
  )
);

DROP POLICY IF EXISTS invoices_read ON public.invoices;
CREATE POLICY invoices_read ON public.invoices
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS invoices_write ON public.invoices;
CREATE POLICY invoices_write ON public.invoices
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS invoice_items_read ON public.invoice_items;
CREATE POLICY invoice_items_read ON public.invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_read_accounting_org(i.org_id)
  )
);

DROP POLICY IF EXISTS invoice_items_write ON public.invoice_items;
CREATE POLICY invoice_items_write ON public.invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_write_accounting_org(i.org_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = invoice_id
      AND public.can_write_accounting_org(i.org_id)
  )
);

DROP POLICY IF EXISTS contacts_read ON public.contacts;
CREATE POLICY contacts_read ON public.contacts
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS contacts_write ON public.contacts;
CREATE POLICY contacts_write ON public.contacts
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS tax_rates_read ON public.tax_rates;
CREATE POLICY tax_rates_read ON public.tax_rates
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS tax_rates_write ON public.tax_rates;
CREATE POLICY tax_rates_write ON public.tax_rates
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS currencies_read ON public.currencies;
CREATE POLICY currencies_read ON public.currencies
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS currencies_write ON public.currencies;
CREATE POLICY currencies_write ON public.currencies
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS documents_read ON public.documents;
CREATE POLICY documents_read ON public.documents
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS documents_write ON public.documents;
CREATE POLICY documents_write ON public.documents
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS payroll_records_read ON public.payroll_records;
CREATE POLICY payroll_records_read ON public.payroll_records
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS payroll_records_write ON public.payroll_records;
CREATE POLICY payroll_records_write ON public.payroll_records
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS inventory_items_read ON public.inventory_items;
CREATE POLICY inventory_items_read ON public.inventory_items
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS inventory_items_write ON public.inventory_items;
CREATE POLICY inventory_items_write ON public.inventory_items
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

DROP POLICY IF EXISTS audit_log_read ON public.audit_log;
CREATE POLICY audit_log_read ON public.audit_log
FOR SELECT USING (public.can_read_accounting_org(org_id));

DROP POLICY IF EXISTS audit_log_write ON public.audit_log;
CREATE POLICY audit_log_write ON public.audit_log
FOR ALL USING (public.can_write_accounting_org(org_id))
WITH CHECK (public.can_write_accounting_org(org_id));

COMMIT;
