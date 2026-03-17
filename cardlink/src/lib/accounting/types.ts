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
  status: "draft" | "sent" | "paid" | "overdue";
  total: number;
  tax: number;
  currency: string;
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
