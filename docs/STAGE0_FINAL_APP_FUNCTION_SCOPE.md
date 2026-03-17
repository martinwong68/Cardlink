# Stage-0: Final App Function and Scope (Professional Baseline)

## 1. Objective
- Define the full final-version function scope before build starts.
- Align two-app strategy:
- Client App is a focused public and customer-facing experience.
- Business App is the complete business operating system.
- Set a professional baseline comparable to mainstream pro business apps, while keeping user workflows simple and friendly.

## 2. Scope in
- Full function catalog for final version across all modules:
- Namecard, inventory, procurement, POS, online shop, accounting, HR, channel.
- App-level scope split (Client App vs Business App).
- Professional operating requirements (security, auditability, reliability, compliance readiness).
- User-friendly standards (task speed, onboarding, clarity, mobile-first ergonomics).
- Integration scope for payments, events, reporting, and role-based controls.

## 3. Scope out
- No code implementation.
- No DB migration execution.
- No third-party contract signing.
- No final legal or tax certification statements.
- No guaranteed parity with every enterprise ERP edge case.

## 4. Deliverables
- Final Function Catalog (v1).
- App Ownership Matrix (v1).
- Professional Baseline Requirements (v1).
- UX Simplicity Standards (v1).
- Final-version acceptance checklist (v1).

## 5. Final Function Catalog

### 5.1 Client App (minimized but polished)
- Public card profile browsing and share.
- NFC tap landing and status handling (valid, expired, suspended, deactivated, no-card).
- Basic lead/contact capture from public card.
- Minimal consumer interactions (save contact, request callback, quick connect).
- Customer-facing order status check (read-only, optional by business setting).
- Language and accessibility essentials.

### 5.2 Business App (all business operations)

#### A) Namecard Module
- Card lifecycle management (create, edit, publish, unpublish, archive).
- Multi-template card design with company-approved branding rules.
- Team card provisioning by role and department.
- NFC card binding, assignment, state management, and replacement flow.
- Card analytics dashboard (views, taps, conversion, source channels).
- Lead management handoff from card interactions.

#### B) Company Management Module
- Company profile, branch profile, and operating info.
- Organization and member administration.
- Role-based access control (owner/admin/manager/staff/accounting/hr/custom).
- Approval matrix setup for procurement and refunds.
- Policy center (discount limits, return policy, stock adjustment policy).

#### C) Inventory Module
- Product catalog and variant management.
- SKU, barcode, pricing tiers, and unit definitions.
- Stock movement ledger (in/out/adjust/transfer/reserve/release).
- Real-time stock balance and availability.
- Low-stock alerts and replenishment suggestions.
- Cycle count and stock discrepancy workflow.

#### D) Procurement Module
- Supplier master and supplier performance profile.
- Purchase request and purchase order lifecycle.
- Multi-step approval routing for PO.
- Goods receipt and discrepancy handling.
- Purchase return flow and supplier credit note tracking.
- Cost intake linkage to accounting events.

#### E) POS Module (iPhone + iPad first)
- Fast checkout (scan/search/add cart/pay/receipt).
- iPhone Tap to Pay receiving flow (subject to provider and region capability).
- iPad counter POS mode for high-throughput operation.
- Split payment, partial payment, refund, void, and cancellation workflows.
- Offline-tolerant queue for temporary network interruptions.
- Shift management (open/close, cash in/out, drawer reconciliation).

#### F) Online Shop Module
- Product publishing and category storefront management.
- Cart and checkout with customer info capture.
- Payment confirmation and order lifecycle tracking.
- Shipping and pickup mode support.
- Promotion basics (coupon, bundle, campaign windows).
- Shop order events routed to inventory and accounting contracts.

#### G) Accounting Module
- Chart of accounts and mapping configuration.
- Automatic journal generation from POS/procurement/shop events.
- Revenue, cost, receivable, payable, tax summary dashboards.
- Period close checklist and lock controls.
- Reconciliation center (payment, order, stock, journal consistency checks).
- Export-ready reports for accountant workflows.

#### H) HR Module
- Employee records and employment status.
- Role assignment and permission-linked position profiles.
- Attendance check-in/out and shift assignment.
- Leave request and approval flow.
- Payroll input export support (payroll engine integration ready).
- HR alerts (expiring contracts, missing attendance actions).

#### I) Channel Module
- Partner profile and channel hierarchy management.
- Referral capture from card/shop/partner sources.
- Commission policy and earning calculation rules.
- Conversion tracking from lead -> order -> payout.
- Channel performance dashboard and settlement exports.

## 6. App Ownership Matrix

### 6.1 Client App owns
- Public discovery and customer interaction only.
- Zero business admin writes.

### 6.2 Business App owns
- All company-admin, operational, financial, and staff workflows.
- Company card management and company management in full.
- All future business feature development.

### 6.3 Shared backend contracts
- Unified identity, tenant context, and company scoping.
- API and event versioning governance.
- Cross-module observability and audit logs.

## 7. Professional Baseline Requirements
- Security:
- Strict RBAC, tenant isolation, sensitive-action audit logs, and data retention policy.
- Reliability:
- Idempotent write APIs, webhook deduplication, outbox event publishing, and recovery runbooks.
- Traceability:
- Correlation IDs across POS, inventory, procurement, and accounting chains.
- Governance:
- Contract-first change control and Architecture-Guard approval gates.
- Compliance readiness:
- Financial action logs, export trails, and role-action accountability.

## 8. User-Friendly Product Standards
- Mobile-first operations:
- One-hand iPhone checkout flow, large touch targets, and clear error recovery.
- Fast path design:
- Core staff tasks complete in under 3 screens where possible.
- Guided onboarding:
- Setup wizard for company profile, products, payment setup, and role assignment.
- Explainable actions:
- Every critical action shows impact preview and undo/rollback guidance.
- Smart defaults:
- Preset templates for card design, POS tax setup, and procurement terms.
- Contextual help:
- Inline hints and workflow tips for first-time operators.

## 9. Risks and mitigations
- Risk: Trying to match every pro app feature delays execution.
- Mitigation: Keep final catalog broad but prioritize staged adoption by business impact.
- Risk: Two-app model creates confusion for users.
- Mitigation: Strong app positioning and in-app route guard to correct destination.
- Risk: POS payment flow differs by provider capability.
- Mitigation: Capability matrix and fallback flow are mandatory before release.
- Risk: Financial and stock inconsistencies reduce trust.
- Mitigation: Reconciliation dashboard and exception queue are part of baseline.

## 10. Acceptance checklist
- Final function catalog for all modules is documented and approved.
- Client App vs Business App ownership split is documented and approved.
- Professional baseline requirements are documented and approved.
- User-friendly standards are documented and approved.
- Stage gates can reference this file as the final-version scope baseline.
- No implementation starts before explicit build approval command.
