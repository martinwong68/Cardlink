export type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  is_active: boolean;
};

export type TransactionLineRow = {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  currency: string;
};

export type TransactionRow = {
  id: string;
  date: string;
  description: string | null;
  reference_number: string | null;
  status: "draft" | "posted" | "voided";
  lines: TransactionLineRow[];
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "partially_paid";
  total: number;
  tax: number;
  currency: string;
  payment_terms: string | null;
  amount_paid: number;
  balance_due: number;
};

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: "customer" | "vendor" | "employee";
};

export type PayrollRow = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: "draft" | "processed" | "paid";
};

export type InventoryItemRow = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  account_id: string | null;
  category: string | null;
};

export type DocumentRow = {
  id: string;
  file_url: string;
  ocr_text: string | null;
  created_at: string;
};

export type TaxRateRow = {
  id: string;
  name: string;
  rate: number;
  region: string | null;
  is_default: boolean;
};

export type CurrencyRow = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  last_updated: string;
};

/* ── Phase-1 new types ─────────────────────────────────────── */

export type VendorBillRow = {
  id: string;
  bill_number: string;
  vendor_id: string | null;
  vendor_name: string;
  vendor_email: string | null;
  issue_date: string;
  due_date: string;
  status: "draft" | "approved" | "partially_paid" | "paid" | "overdue" | "voided";
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  payment_terms: string | null;
  notes: string | null;
  reference: string | null;
};

export type VendorBillItemRow = {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  account_id: string | null;
};

export type PaymentRow = {
  id: string;
  payment_number: string;
  payment_type: "received" | "made";
  related_type: "invoice" | "vendor_bill";
  related_id: string;
  contact_id: string | null;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "credit_card" | "cheque" | "other";
  payment_date: string;
  reference: string | null;
  notes: string | null;
  currency: string;
  exchange_rate: number;
  transaction_id: string | null;
};

export type BankAccountRow = {
  id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string | null;
  currency: string;
  ledger_account_id: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
};

export type BankTransactionRow = {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference: string | null;
  source: "manual" | "import" | "feed";
  is_reconciled: boolean;
  matched_transaction_id: string | null;
};

export type BankReconciliationRow = {
  id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  ledger_balance: number;
  difference: number;
  status: "in_progress" | "completed";
  matched_count: number;
  unmatched_count: number;
};

export type FiscalYearRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "locked";
};

export type FiscalPeriodRow = {
  id: string;
  fiscal_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed" | "locked";
  closed_by: string | null;
  closed_at: string | null;
};

export type AgingBucket = {
  range: string;
  amount: number;
  count: number;
};
