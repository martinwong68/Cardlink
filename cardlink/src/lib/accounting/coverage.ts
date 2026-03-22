export type AccountingCoverageStatus = "implemented" | "partial" | "missing";

export type AccountingBenchmarkSource = {
  name: string;
  focusArea: string;
  note: string;
  benchmarkSnapshot: string;
  url: string;
};

export type AccountingFunctionCoverage = {
  id: string;
  title: string;
  benchmarkLevel: "Essential" | "Advanced";
  status: AccountingCoverageStatus;
  currentScope: string;
  missingScope: string;
};

export type AccountingWorkflowCoverage = {
  id: string;
  title: string;
  benchmarkLevel: "Essential" | "Advanced";
  status: AccountingCoverageStatus;
  currentScope: string;
  missingScope: string;
};

export const accountingBenchmarkSources: AccountingBenchmarkSource[] = [
  {
    name: "ERPNext",
    focusArea: "Broad SMB accounting + ERP workflow coverage",
    note: "Used as the benchmark for integrated ledgers, inventory, payables, payroll, and period-close controls.",
    benchmarkSnapshot: "Reviewed against publicly documented 2026 product pages",
    url: "https://frappe.io/erpnext/open-source-accounting",
  },
  {
    name: "Odoo Accounting",
    focusArea: "Professional accounting operations for growing companies",
    note: "Used as the benchmark for bank reconciliation, taxes, reporting, approvals, and multi-company readiness.",
    benchmarkSnapshot: "Reviewed against publicly documented 2026 product pages",
    url: "https://www.odoo.com/",
  },
  {
    name: "Akaunting",
    focusArea: "Small-business accounting essentials",
    note: "Used as the benchmark for lightweight invoicing, bills, expense capture, and recurring accounting tasks.",
    benchmarkSnapshot: "Reviewed against publicly documented 2026 product pages",
    url: "https://akaunting.com/",
  },
];

export const accountingFunctionCoverage: AccountingFunctionCoverage[] = [
  {
    id: "core-ledger",
    title: "Chart of accounts + general ledger",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "Cardlink already supports a structured chart of accounts, double-entry transaction lines, and organization-scoped accounting records.",
    missingScope: "No major gap for the base ledger layer.",
  },
  {
    id: "journal-entries",
    title: "Manual journal entry management",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "Users can create and review draft or posted journal entries for core bookkeeping flows.",
    missingScope: "No major gap for manual postings.",
  },
  {
    id: "sales-invoicing",
    title: "Customer invoicing",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "The accounting module can create, list, view, and track invoices with statuses such as draft, sent, paid, and overdue.",
    missingScope: "No major gap for the invoice issuance layer.",
  },
  {
    id: "financial-reports",
    title: "Financial statements and reporting",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "Profit & loss, balance sheet, cash-flow, and trial balance reports are exposed through the accounting reports API and UI.",
    missingScope: "Cash-flow is still an estimated model rather than a fully classified direct/indirect statement.",
  },
  {
    id: "contacts-documents",
    title: "Accounting contacts and source documents",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "Customers, vendors, employees, and uploaded accounting documents are already represented in the accounting module.",
    missingScope: "No major gap for basic contact and document storage.",
  },
  {
    id: "inventory-linkage",
    title: "Inventory-linked accounting",
    benchmarkLevel: "Advanced",
    status: "implemented",
    currentScope: "Inventory items exist in accounting, and procurement/POS flows can post linked journal entries into the ledger.",
    missingScope: "Further valuation methods can be added later if needed.",
  },
  {
    id: "payroll",
    title: "Payroll register in accounting",
    benchmarkLevel: "Advanced",
    status: "implemented",
    currentScope: "Payroll records, salary totals, deductions, and payroll summaries are already available in the accounting module.",
    missingScope: "No major gap for storing payroll records, though deeper payroll compliance can still expand later.",
  },
  {
    id: "receivables",
    title: "Accounts receivable follow-up",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Invoice statuses and overdue totals provide a basic receivables signal.",
    missingScope: "Missing a dedicated A/R aging report, collection queue, credit notes, and receipt allocation workflow.",
  },
  {
    id: "payables",
    title: "Vendor bills and accounts payable",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Vendor contacts exist and procurement receipts can create payable journal entries.",
    missingScope: "Missing a dedicated vendor bill capture, bill approval, payment run, supplier credit, and A/P aging workflow.",
  },
  {
    id: "tax-currency",
    title: "Tax setup and multi-currency settings",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Tax rates and currencies are configurable through accounting settings.",
    missingScope: "Missing automated tax filing workflows, tax settlement, foreign currency revaluation, and gain/loss postings.",
  },
  {
    id: "bank-reconciliation",
    title: "Bank feeds and reconciliation",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "A bank-feed contract exists, which shows the intended integration point for external banking data.",
    missingScope: "Missing live bank connectivity, statement matching, unmatched-item review, and reconciliation approval.",
  },
  {
    id: "period-close",
    title: "Period close controls",
    benchmarkLevel: "Essential",
    status: "missing",
    currentScope: "The app stores accounting transactions and audit artifacts, but does not expose a formal close process.",
    missingScope: "Missing close checklist, lock dates, re-open controls, and an accountant sign-off workflow.",
  },
  {
    id: "recurring-automation",
    title: "Recurring accounting automation",
    benchmarkLevel: "Advanced",
    status: "missing",
    currentScope: "Core transaction and invoice records exist and can be extended for automation later.",
    missingScope: "Missing recurring invoices, recurring bills, recurring journals, and scheduled accrual/deferral support.",
  },
  {
    id: "fixed-assets",
    title: "Fixed assets and depreciation",
    benchmarkLevel: "Advanced",
    status: "missing",
    currentScope: "The current model tracks general ledger balances but does not model fixed asset registers.",
    missingScope: "Missing asset capitalization, depreciation schedules, disposals, and asset roll-forward reporting.",
  },
  {
    id: "budgets",
    title: "Budgets, cost centers, and variance review",
    benchmarkLevel: "Advanced",
    status: "missing",
    currentScope: "Financial reporting exists, but without budget planning dimensions.",
    missingScope: "Missing budgeting, departmental cost centers, approvals, and budget-vs-actual variance analysis.",
  },
];

export const accountingWorkflowCoverage: AccountingWorkflowCoverage[] = [
  {
    id: "record-to-report",
    title: "Record-to-report",
    benchmarkLevel: "Essential",
    status: "implemented",
    currentScope: "Cardlink can capture journal entries and generate core financial statements from posted transaction lines.",
    missingScope: "No major gap for the base reporting loop.",
  },
  {
    id: "inventory-to-ledger",
    title: "Inventory receipt to ledger",
    benchmarkLevel: "Advanced",
    status: "implemented",
    currentScope: "Procurement receipts can post the inventory-versus-accounts-payable journal entry automatically.",
    missingScope: "Future enhancements can add landed costs and more detailed inventory valuation controls.",
  },
  {
    id: "order-to-cash",
    title: "Order/Invoice to cash",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Invoices can be issued and marked paid, with revenue and cash journals created when payment is posted.",
    missingScope: "Missing quotations/estimates, structured receipt allocation, dunning, credit notes, and receivables aging follow-up.",
  },
  {
    id: "procure-to-pay",
    title: "Procure to pay",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Procurement events can create accounting impact and vendor contacts can be stored.",
    missingScope: "Missing vendor bills, bill approval, due-date scheduling, payment processing, and supplier statement reconciliation.",
  },
  {
    id: "expense-to-posting",
    title: "Expense capture to posting",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Documents and journal entries provide a manual way to capture business expenses.",
    missingScope: "Missing a dedicated expense claim workflow, approval chain, OCR-to-ledger mapping, and recurring expense automation.",
  },
  {
    id: "payroll-to-books",
    title: "Payroll to books",
    benchmarkLevel: "Advanced",
    status: "partial",
    currentScope: "Payroll records are visible in accounting and summarized for review.",
    missingScope: "Missing automated payroll journal posting, payroll liabilities clearing, and statutory remittance workflow.",
  },
  {
    id: "tax-to-filing",
    title: "Tax setup to filing",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "Tax rates can be configured and invoices carry tax amounts.",
    missingScope: "Missing tax returns, payable settlements, jurisdiction-specific filing packs, and audit-ready tax summaries.",
  },
  {
    id: "bank-to-reconciliation",
    title: "Bank statement to reconciliation",
    benchmarkLevel: "Essential",
    status: "partial",
    currentScope: "The app exposes a bank-feed placeholder that shows the planned integration point.",
    missingScope: "Missing statement import, match suggestions, unmatched review, bank transfers, and reconciliation sign-off.",
  },
  {
    id: "month-end-close",
    title: "Month-end close",
    benchmarkLevel: "Essential",
    status: "missing",
    currentScope: "Financial data is available, but the period-close operating workflow is not yet present.",
    missingScope: "Missing close checklist, accrual review, period locks, exception handling, and management sign-off.",
  },
];

function countByStatus(status: AccountingCoverageStatus) {
  return accountingFunctionCoverage.filter((item) => item.status === status).length;
}

function countWorkflowByStatus(status: AccountingCoverageStatus) {
  return accountingWorkflowCoverage.filter((item) => item.status === status).length;
}

export const accountingCoverageSummary = {
  implemented: countByStatus("implemented"),
  partial: countByStatus("partial"),
  missing: countByStatus("missing"),
  workflowsImplemented: countWorkflowByStatus("implemented"),
  workflowsPartial: countWorkflowByStatus("partial"),
  workflowsMissing: countWorkflowByStatus("missing"),
};

export const accountingHighPriorityGaps = [
  "Vendor bills, supplier payments, and A/P aging",
  "Bank statement import and reconciliation controls",
  "Receivables aging, collections, and credit notes",
  "Month-end close with lock dates and sign-off",
  "Tax settlement and filing workflow",
];

const readinessLabel =
  accountingCoverageSummary.missing === 0 && accountingCoverageSummary.partial <= 2
    ? "already covers most of the professional accounting scope expected for an SMC"
    : "already covers the accounting foundation for an SMC";

const completenessLabel =
  accountingCoverageSummary.missing === 0
    ? "It is close to being comprehensive, but still has a few partial workflows to complete."
    : "It is not yet fully comprehensive for a professional SMC accounting operation because critical control workflows are still missing or partial.";

const workflowGapLabel =
  accountingCoverageSummary.workflowsMissing === 1 ? "missing workflow" : "missing workflows";

export const accountingCoverageVerdict =
  `Cardlink ${readinessLabel}: ledger, invoices, journals, reports, contacts, documents, payroll records, and inventory-linked posting. ${completenessLabel} ` +
  `Current benchmark result: ${accountingCoverageSummary.implemented} implemented functions, ` +
  `${accountingCoverageSummary.partial} partial functions, ${accountingCoverageSummary.missing} missing functions, ` +
  `${accountingCoverageSummary.workflowsImplemented} implemented workflows, ` +
  `${accountingCoverageSummary.workflowsPartial} partial workflows, and ` +
  `${accountingCoverageSummary.workflowsMissing} ${workflowGapLabel}.`;
