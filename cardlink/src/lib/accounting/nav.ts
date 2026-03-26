export type AccountingNavItem = {
  id: string;
  href: string;
  label: string;
  shortLabel: string;
};

export const accountingNavItems: AccountingNavItem[] = [
  { id: "setup", href: "/business/accounting/setup", label: "Setup", shortLabel: "Setup" },
  { id: "dashboard", href: "/business/accounting/dashboard", label: "Dashboard", shortLabel: "Dashboard" },
  { id: "accounts", href: "/business/accounting/accounts", label: "Chart of Accounts", shortLabel: "Accounts" },
  { id: "transactions", href: "/business/accounting/transactions", label: "Transactions", shortLabel: "Txns" },
  { id: "invoices", href: "/business/accounting/invoices", label: "Invoices", shortLabel: "Invoices" },
  { id: "bills", href: "/business/accounting/bills", label: "Bills (AP)", shortLabel: "Bills" },
  { id: "payments", href: "/business/accounting/payments", label: "Payments", shortLabel: "Payments" },
  { id: "banking", href: "/business/accounting/banking", label: "Banking", shortLabel: "Banking" },
  { id: "reports", href: "/business/accounting/reports", label: "Reports", shortLabel: "Reports" },
  { id: "contacts", href: "/business/accounting/contacts", label: "Contacts", shortLabel: "Contacts" },
  { id: "payroll", href: "/business/accounting/payroll", label: "Payroll", shortLabel: "Payroll" },
  { id: "inventory", href: "/business/accounting/inventory", label: "Inventory", shortLabel: "Inventory" },
  { id: "documents", href: "/business/accounting/documents", label: "Documents", shortLabel: "Docs" },
  { id: "periods", href: "/business/accounting/periods", label: "Fiscal Periods", shortLabel: "Periods" },
  { id: "settings", href: "/business/accounting/settings", label: "Settings", shortLabel: "Settings" },
];
