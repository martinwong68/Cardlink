export type AccountingNavItem = {
  id: string;
  href: string;
  label: string;
  shortLabel: string;
};

export const accountingNavItems: AccountingNavItem[] = [
  { id: "dashboard", href: "/business/accounting/dashboard", label: "Dashboard", shortLabel: "Dashboard" },
  { id: "accounts", href: "/business/accounting/accounts", label: "Chart of Accounts", shortLabel: "Accounts" },
  { id: "transactions", href: "/business/accounting/transactions", label: "Transactions", shortLabel: "Txns" },
  { id: "invoices", href: "/business/accounting/invoices", label: "Invoices", shortLabel: "Invoices" },
  { id: "reports", href: "/business/accounting/reports", label: "Reports", shortLabel: "Reports" },
  { id: "contacts", href: "/business/accounting/contacts", label: "Contacts", shortLabel: "Contacts" },
  { id: "payroll", href: "/business/accounting/payroll", label: "Payroll", shortLabel: "Payroll" },
  { id: "inventory", href: "/business/accounting/inventory", label: "Inventory", shortLabel: "Inventory" },
  { id: "documents", href: "/business/accounting/documents", label: "Documents", shortLabel: "Docs" },
  { id: "settings", href: "/business/accounting/settings", label: "Settings", shortLabel: "Settings" },
];
