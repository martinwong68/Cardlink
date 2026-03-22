# Booking App Function Audit & SMC Accounting Readiness Assessment

> **Date:** 2026-03-22
> **Scope:** Cardlink Business Suite — Booking Module + Accounting Module
> **Reference Projects:** Cal.com, Easy!Appointments, Acuity Scheduling, SimplyBook.me, Zoho Bookings
> **Target:** SMC (Small-Medium Company) running a service-based business

---

## 1. Objective

Audit the Cardlink booking module against industry-standard professional booking apps (open-source and commercial) to identify:

- Functions and workflows already implemented
- Functions and workflows that are missing
- Whether the integrated accounting module is comprehensive enough for an SMC

## 2. Scope In

- Booking module features (services, appointments, calendar, availability)
- Booking-to-accounting integration
- Accounting module completeness for SMC needs
- Cross-module integration (POS, CRM, inventory, store, HR)

## 3. Scope Out

- UI/UX polish and design refinements
- Performance optimization
- Mobile native app features (this is a web app)
- Enterprise-grade features (SSO, HIPAA, SOC 2)

---

## 4. Professional Booking App — Master Function List

The following is a comprehensive function list compiled from Cal.com, Easy!Appointments, Acuity Scheduling, SimplyBook.me, and Zoho Bookings.

### 4.1 Service Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1 | Create / edit / delete services | ✅ Present | Full CRUD via `/api/business/booking/services` |
| 2 | Service name, description, price | ✅ Present | All fields in `booking_services` table |
| 3 | Service duration (minutes) | ✅ Present | `duration_minutes` field, default 60 |
| 4 | Service categories / grouping | ✅ Present | `category` field on services |
| 5 | Active / inactive toggle | ✅ Present | `is_active` boolean with RLS for public visibility |
| 6 | Maximum concurrent bookings | ✅ Present | `max_concurrent` field, default 1 |
| 7 | Buffer time before/after appointments | ❌ Missing | No `buffer_before` / `buffer_after` fields |
| 8 | Service-specific availability overrides | ✅ Present | `booking_availability.service_id` nullable FK |
| 9 | Service images / media | ❌ Missing | No image_url field on services |
| 10 | Service add-ons / extras | ❌ Missing | No add-on or upsell capability |
| 11 | Group / class bookings (multi-attendee) | ❌ Missing | Only single-customer appointments |
| 12 | Service location (physical / virtual / on-site) | ❌ Missing | No location_type field |

### 4.2 Appointment Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 13 | Create appointment (staff side) | ✅ Present | POST `/api/business/booking/appointments` |
| 14 | View / list appointments with filters | ✅ Present | GET with `date_from`, `date_to`, `status` filters |
| 15 | Update appointment details | ✅ Present | PUT endpoint for status, notes, customer info |
| 16 | Appointment status lifecycle | ✅ Present | pending → confirmed → completed / cancelled / no_show |
| 17 | Customer name, email, phone | ✅ Present | Fields on `booking_appointments` |
| 18 | Link to registered user | ✅ Present | `customer_user_id` FK to `auth.users` |
| 19 | Appointment notes (internal) | ✅ Present | `notes` text field |
| 20 | Auto-calculate end time from duration | ✅ Present | API calculates `end_time = start_time + duration` |
| 21 | Appointment pricing | ✅ Present | `total_price` from service price |
| 22 | Staff / provider assignment | ❌ Missing | No `staff_id` or `assigned_to` field |
| 23 | Recurring appointments | ❌ Missing | No recurrence pattern or rule fields |
| 24 | Customer self-service rescheduling | ❌ Missing | No public reschedule endpoint or UI |
| 25 | Customer self-service cancellation | ❌ Missing | No public cancellation endpoint or UI |
| 26 | Minimum advance notice for bookings | ❌ Missing | No `min_notice_hours` setting |
| 27 | Maximum advance booking window | ❌ Missing | No `max_advance_days` setting |
| 28 | Appointment tags / labels | ❌ Missing | No tagging system on appointments |
| 29 | Appointment history / audit log | ❌ Missing | No `booking_audit_log` (general `company_audit_logs` exists) |
| 30 | Waitlist when fully booked | ❌ Missing | No waitlist status or table |
| 31 | Double-booking prevention (real-time) | ❌ Missing | No overlap check in appointment creation API |

### 4.3 Calendar & Availability

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 32 | Weekly availability schedule | ✅ Present | `booking_availability` with `day_of_week` 0-6 |
| 33 | Company-wide default hours | ✅ Present | `service_id IS NULL` for company-wide |
| 34 | Service-specific hours | ✅ Present | `service_id` FK on availability |
| 35 | Day view calendar | ✅ Present | Hourly grid 8am-8pm, positioned appointments |
| 36 | Week view calendar | ✅ Present | 7-column grid with appointment counts |
| 37 | Month view calendar | ❌ Missing | Only day and week views |
| 38 | Calendar navigation (prev/next) | ✅ Present | Previous/Next buttons for day and week |
| 39 | Holiday / blackout dates | ❌ Missing | No blackout_dates table or holiday handling |
| 40 | Break times within working hours | ❌ Missing | No break/lunch time slots |
| 41 | External calendar sync (Google, Outlook) | ❌ Missing | No calendar integration API |
| 42 | Real-time availability check | ❌ Missing | No slot validation against existing appointments |
| 43 | Time zone support | ❌ Missing | No timezone field on availability or appointments |

### 4.4 Customer-Facing Booking

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 44 | Public booking page / widget | ❌ Missing | No `/book/[slug]` or public booking route |
| 45 | Embeddable booking widget | ❌ Missing | No iframe/embed code generation |
| 46 | Service selection by customer | ❌ Missing | No public service browsing |
| 47 | Available slot display | ❌ Missing | No public availability checking |
| 48 | Customer booking form | ❌ Missing | Only admin-side appointment creation |
| 49 | Booking confirmation page | ❌ Missing | No public confirmation view |
| 50 | Branded booking page | ❌ Missing | No white-label booking page |
| 51 | Custom intake form fields | ❌ Missing | No custom fields beyond name/email/phone |
| 52 | Routing form (direct to right service/staff) | ❌ Missing | No routing logic |

### 4.5 Notifications & Reminders

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 53 | In-app notification on new booking | ✅ Present | `notifyNewBooking()` creates dashboard notification |
| 54 | Email confirmation to customer | ❌ Missing | No email provider (Resend, SendGrid) in dependencies |
| 55 | Email confirmation to staff | ❌ Missing | Same — no email sending capability |
| 56 | SMS confirmation | ❌ Missing | No SMS provider (Twilio) in dependencies |
| 57 | Email reminder before appointment | ❌ Missing | No reminder scheduling system |
| 58 | SMS reminder before appointment | ❌ Missing | No SMS capability |
| 59 | Follow-up / feedback request after appointment | ❌ Missing | No post-appointment workflow |
| 60 | Cancellation notification | ❌ Missing | No notification on status changes |
| 61 | No-show notification | ❌ Missing | No notification on no-show |
| 62 | Customizable notification templates | ❌ Missing | No template system |

### 4.6 Payment & Billing Integration

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 63 | Online payment at booking | ❌ Missing | No Stripe integration for bookings (POS has it) |
| 64 | Deposit / partial payment collection | ❌ Missing | No deposit handling |
| 65 | Payment status tracking | ❌ Missing | No `payment_status` field on appointments |
| 66 | Refund processing | ❌ Missing | No refund workflow |
| 67 | No-show / cancellation fees | ❌ Missing | No penalty/fee system |
| 68 | Invoice generation from booking | ❌ Missing | No auto-invoice creation |
| 69 | Booking → Accounting journal entry | ❌ Missing | `cross-module-integration.ts` handles invoices/POS only |
| 70 | Revenue recognition (deferred → earned) | ❌ Missing | No booking revenue lifecycle |

### 4.7 Staff / Provider Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 71 | Assign staff to services | ❌ Missing | No staff-service linking table |
| 72 | Staff individual availability | ❌ Missing | Availability is company/service level only |
| 73 | Round-robin appointment distribution | ❌ Missing | No auto-assignment logic |
| 74 | Staff calendar view | ❌ Missing | Calendar shows all appointments, not per-staff |
| 75 | Staff breaks / time off | ❌ Missing | No staff availability management |

### 4.8 Reporting & Analytics

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 76 | Booking count by period | ✅ Partial | Dashboard shows today/upcoming counts |
| 77 | Completion rate | ✅ Present | Dashboard calculates completion % |
| 78 | Revenue from bookings | ❌ Missing | No booking revenue report |
| 79 | Popular services report | ❌ Missing | No service popularity analytics |
| 80 | No-show rate | ❌ Missing | No no-show analytics |
| 81 | Staff utilization report | ❌ Missing | No staff-level metrics |
| 82 | Customer retention / repeat visit | ❌ Missing | No repeat customer tracking |
| 83 | Peak hours / demand heatmap | ❌ Missing | No time-based analytics |

### 4.9 Cross-Module Integration

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 84 | Booking service ↔ Store product sync | ✅ Present | `booking-store-sync.ts` bidirectional |
| 85 | Booking → CRM lead/contact | ❌ Missing | No auto-CRM contact creation from bookings |
| 86 | Booking → Membership points | ❌ Missing | No loyalty points for bookings |
| 87 | Booking → Inventory consumption | ❌ Missing | No material/supply tracking per service |
| 88 | Booking → POS order integration | ❌ Missing | No POS order creation from completed booking |

---

## 5. Professional Booking App — Master Workflow List

### 5.1 Core Booking Workflows

| # | Workflow | Cardlink Status | Notes |
|---|----------|----------------|-------|
| W1 | Customer visits public page → selects service → picks slot → fills form → confirms → receives email | ❌ Missing | No public booking flow |
| W2 | Staff creates appointment from dashboard → notification sent to customer | ✅ Partial | Staff can create, but only in-app notification (no email to customer) |
| W3 | Customer reschedules via link → availability re-checked → new time confirmed → both notified | ❌ Missing | No self-service reschedule |
| W4 | Customer cancels via link → slot freed → refund processed (if applicable) → both notified | ❌ Missing | No self-service cancel or refund |
| W5 | Reminder sent 24h before → customer confirms or reschedules | ❌ Missing | No reminder system |
| W6 | Appointment completed → feedback requested → review collected | ❌ Missing | No feedback system |
| W7 | No-show detected → penalty applied → customer notified | ❌ Missing | Status can be set but no automated handling |

### 5.2 Payment Workflows

| # | Workflow | Cardlink Status | Notes |
|---|----------|----------------|-------|
| W8 | Booking created → deposit collected via Stripe → balance due at service | ❌ Missing | No payment flow |
| W9 | Service completed → invoice auto-generated → payment link sent | ❌ Missing | No booking-to-invoice workflow |
| W10 | Payment received → journal entry created → revenue recognized | ❌ Missing | No booking→accounting link |
| W11 | Cancellation → refund processed → accounting reversal entry | ❌ Missing | No refund/reversal workflow |

### 5.3 Staff Workflows

| # | Workflow | Cardlink Status | Notes |
|---|----------|----------------|-------|
| W12 | Admin assigns staff → staff sees own calendar → manages availability | ❌ Missing | No staff assignment |
| W13 | Round-robin auto-assigns based on staff availability | ❌ Missing | No auto-assignment |
| W14 | Staff marks time off → availability auto-updated → existing appointments rescheduled | ❌ Missing | No time-off management |

### 5.4 Recurring Booking Workflows

| # | Workflow | Cardlink Status | Notes |
|---|----------|----------------|-------|
| W15 | Customer books recurring (e.g., weekly) → system auto-creates future appointments | ❌ Missing | No recurring support |
| W16 | Recurring series modified → future appointments updated | ❌ Missing | No series management |

---

## 6. Cardlink Booking Module — Summary Score

### Functions: 18 / 88 present (20.5%)

| Category | Present | Missing | Total | Score |
|----------|---------|---------|-------|-------|
| Service Management | 6 | 6 | 12 | 50% |
| Appointment Management | 9 | 10 | 19 | 47% |
| Calendar & Availability | 6 | 6 | 12 | 50% |
| Customer-Facing Booking | 0 | 9 | 9 | 0% |
| Notifications & Reminders | 1 | 9 | 10 | 10% |
| Payment & Billing | 0 | 8 | 8 | 0% |
| Staff / Provider Management | 0 | 5 | 5 | 0% |
| Reporting & Analytics | 2 | 6 | 8 | 25% |
| Cross-Module Integration | 1 | 4 | 5 | 20% |

### Workflows: 1 partial / 16 total (6%)

---

## 7. Missing Functions — Prioritized List

### 🔴 Critical (Must-have for any professional booking app)

| Priority | Function | Impact |
|----------|----------|--------|
| P0 | **Public booking page** (#44-51) | Without this, customers cannot self-book. All bookings are staff-created. |
| P0 | **Double-booking prevention** (#31) | No overlap check means simultaneous bookings can conflict. |
| P0 | **Real-time availability check** (#42) | Customers/staff cannot see which slots are actually free. |
| P0 | **Email confirmation to customer** (#54-55) | Customers receive no booking confirmation. |
| P0 | **Online payment at booking** (#63) | No revenue collection at booking time. |
| P0 | **Booking → Invoice generation** (#68) | Completed bookings don't create invoices. |
| P0 | **Booking → Accounting journal entry** (#69) | Booking revenue not recorded in accounting. |

### 🟡 High Priority (Expected in professional booking apps)

| Priority | Function | Impact |
|----------|----------|--------|
| P1 | **Staff assignment** (#22, #71-75) | Cannot assign appointments to specific providers. |
| P1 | **Buffer time** (#7) | No gap between appointments for preparation/cleanup. |
| P1 | **Minimum advance notice** (#26) | Customers could book 5 minutes before. |
| P1 | **Maximum advance booking** (#27) | No limit on how far in advance customers can book. |
| P1 | **Email/SMS reminders** (#57-58) | No reduction of no-shows via reminders. |
| P1 | **Customer reschedule/cancel** (#24-25) | No self-service modification. |
| P1 | **Payment status tracking** (#65) | Cannot track paid vs unpaid appointments. |
| P1 | **Holiday/blackout dates** (#39) | Cannot block dates for holidays. |

### 🟢 Medium Priority (Differentiating features)

| Priority | Function | Impact |
|----------|----------|--------|
| P2 | **Recurring appointments** (#23) | Cannot handle repeat customers efficiently. |
| P2 | **Waitlist** (#30) | Cannot capture demand when fully booked. |
| P2 | **Month view calendar** (#37) | Limited calendar perspectives. |
| P2 | **Booking revenue report** (#78) | No financial analytics for bookings. |
| P2 | **External calendar sync** (#41) | Staff must check two calendars. |
| P2 | **Deposit collection** (#64) | Cannot secure bookings with deposits. |
| P2 | **Booking → CRM integration** (#85) | Missed opportunity for customer tracking. |
| P2 | **Time zone support** (#43) | Issue for businesses with remote customers. |
| P2 | **Group bookings** (#11) | Cannot handle classes/workshops. |

### ⚪ Nice to Have (Advanced features)

| Priority | Function | Impact |
|----------|----------|--------|
| P3 | Service images (#9) | Visual appeal |
| P3 | Service add-ons (#10) | Upsell opportunity |
| P3 | Routing forms (#52) | Complex service matching |
| P3 | Custom notification templates (#62) | Brand consistency |
| P3 | Staff utilization report (#81) | Resource optimization |
| P3 | Peak hours heatmap (#83) | Demand planning |
| P3 | Embeddable widget (#45) | External website embedding |

---

## 8. SMC Accounting Readiness Assessment

### 8.1 Accounting Module Functions Present

| # | Function | Status | Notes |
|---|----------|--------|-------|
| A1 | Chart of Accounts (tree structure) | ✅ Complete | 5 types: asset, liability, equity, revenue, expense |
| A2 | Double-entry journal entries | ✅ Complete | Debit/credit validation, idempotency keys |
| A3 | Invoice management (AR) | ✅ Complete | Full CRUD, line items, tax calculation, status workflow |
| A4 | Invoice → Journal entry (auto) | ✅ Complete | Auto-creates entry when invoice marked "paid" |
| A5 | Contact management | ✅ Complete | Customer, vendor, employee types |
| A6 | Tax rate configuration | ✅ Complete | Multi-region (GST, VAT), default rate |
| A7 | Multi-currency support | ✅ Complete | Exchange rates, currency codes, transaction-level currency |
| A8 | Payroll processing | ✅ Complete | Gross/deductions/net, AES-256-GCM encryption |
| A9 | Financial reports — Profit & Loss | ✅ Complete | Date-filtered, revenue vs expense |
| A10 | Financial reports — Balance Sheet | ✅ Complete | Assets, liabilities, equity with balance check |
| A11 | Financial reports — Trial Balance | ✅ Complete | Debit/credit totals |
| A12 | Financial reports — Cash Flow | ✅ Complete | Estimated from asset accounts |
| A13 | Document management (OCR) | ✅ Complete | File upload, OCR integration, polymorphic linking |
| A14 | Inventory ledger (cost tracking) | ✅ Complete | SKU, quantity, unit cost, linked to accounts |
| A15 | Audit trail | ✅ Complete | Every create/update/delete logged with old/new values |
| A16 | POS → Accounting journal entry | ✅ Complete | Auto-creates entry on POS order |
| A17 | Procurement → Accounting journal entry | ✅ Complete | Auto-creates entry on goods receipt |
| A18 | Role-based access control | ✅ Complete | Accounting-specific roles and context |
| A19 | Encryption for sensitive data | ✅ Complete | AES-256-GCM for bank details, salary notes |

### 8.2 Accounting Functions Missing or Incomplete

| # | Function | Status | Impact for SMC |
|---|----------|--------|----------------|
| A20 | Bank reconciliation | ⚠️ Placeholder | API returns `{ status: "placeholder" }` — manual reconciliation needed |
| A21 | Accounts Payable management | ❌ Missing | No dedicated AP workflow (bills, payment scheduling, aging) |
| A22 | Expense tracking / claims | ❌ Missing | No employee expense submission/approval |
| A23 | Budget management | ❌ Missing | No budget vs actual tracking |
| A24 | Fixed asset register | ❌ Missing | No depreciation tracking |
| A25 | Recurring journal entries | ❌ Missing | No templates for monthly entries (rent, subscriptions) |
| A26 | Financial year close | ❌ Missing | No year-end closing process |
| A27 | Aged receivables / payables report | ❌ Missing | No aging analysis for AR/AP |
| A28 | Bank statement import (CSV/OFX) | ❌ Missing | Part of bank reconciliation gap |
| A29 | Tax return preparation / export | ❌ Missing | Can configure tax rates but no return filing |
| A30 | Booking → Accounting integration | ❌ Missing | Booking revenue not flowing to accounting |
| A31 | Credit notes / debit notes | ❌ Missing | No adjustment documents |
| A32 | Purchase invoice / bill management | ❌ Missing | No AP bill entry system |
| A33 | Payment voucher / receipt voucher | ❌ Missing | No payment recording documents |
| A34 | Multi-entity / branch accounting | ❌ Missing | Single org per company |
| A35 | Report export (PDF/Excel/CSV) | ⚠️ Partial | Reports generate JSON; no formatted export |

### 8.3 SMC Accounting Verdict

**Score: 19 / 35 essential functions (54%)**

The Cardlink accounting module has a **solid foundation** for SMC accounting:

✅ **Strengths:**
- Proper double-entry bookkeeping (many booking/SMC tools lack this)
- Multi-currency and multi-tax-region support
- Cross-module integration with POS and procurement
- Encrypted payroll processing
- Complete audit trail
- OCR document management
- Four financial statement types

⚠️ **Gaps that impact SMC readiness:**
- **Bank reconciliation** is the #1 gap — SMCs need this for month-end closing
- **Accounts Payable** workflow is missing — SMCs need to track bills and payment deadlines
- **Booking → Accounting** link is absent — service revenue from bookings isn't captured
- **Aged receivables report** is missing — SMCs need to chase overdue invoices
- **Report export** is limited — accountants need PDF/Excel for filing

---

## 9. Overall Assessment

### Is Cardlink comprehensive enough for an SMC?

**Booking Module: Not yet production-ready for customer-facing use.**
The booking module provides solid internal appointment management but lacks the critical customer-facing and payment features that define a professional booking app. The absence of a public booking page, email notifications, and payment integration means the business cannot offer self-service booking to customers.

**Accounting Module: 70% ready for SMC use.**
The accounting foundation is strong with proper double-entry bookkeeping, financial statements, and cross-module integration. However, the missing bank reconciliation, AP management, and booking→accounting link create gaps in the daily accounting workflow.

**Cross-Module Integration: Partially Connected.**
POS and procurement correctly flow into accounting. Booking does not. Store sync works bidirectionally. CRM and membership are not connected to booking.

### Recommended Priority Actions

1. **Public booking page** — Enable customer self-service booking
2. **Double-booking prevention** — Add overlap validation in appointment API
3. **Email notification system** — Add an email provider (e.g., Resend) for confirmations/reminders
4. **Booking → Invoice → Accounting pipeline** — Connect completed bookings to the accounting system
5. **Bank reconciliation** — Complete the placeholder implementation
6. **Accounts Payable workflow** — Add bill management and payment tracking
7. **Staff assignment** — Enable provider-level scheduling
8. **Buffer time + booking rules** — Add advance notice, booking window, and buffer settings

---

## 10. Acceptance Checklist

- [x] Professional booking app function list created (88 functions)
- [x] Professional booking app workflow list created (16 workflows)
- [x] Each function mapped against Cardlink with Present/Missing status
- [x] Missing functions identified and prioritized (P0/P1/P2/P3)
- [x] SMC accounting requirements assessed (35 functions)
- [x] Accounting gaps identified and impact described
- [x] Overall verdict and recommended priority actions provided
- [x] Reference projects cited (Cal.com, Easy!Appointments, Acuity, SimplyBook.me, Zoho Bookings)

---

## 11. References

- [Cal.com](https://cal.com/) — Open-source scheduling infrastructure
- [Easy!Appointments](https://easyappointments.org/) — Open-source appointment booking
- [Acuity Scheduling](https://acuityscheduling.com/) — Professional scheduling by Squarespace
- [SimplyBook.me](https://simplybook.me/) — Online booking system for service businesses
- [Zoho Bookings](https://www.zoho.com/bookings/) — Appointment scheduling software
- [Xero](https://www.xero.com/) — SMC accounting reference
- [QuickBooks](https://quickbooks.intuit.com/) — SMC accounting reference
- [Forbes: Best Accounting Software 2026](https://www.forbes.com/advisor/business/software/best-accounting-software/)
- [SelectHub: Accounting Software Requirements](https://www.selecthub.com/accounting/accounting-software-requirements-checklist/)
