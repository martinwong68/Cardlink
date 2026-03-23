# Booking Module — Feature Gap Analysis for SMC

> **Date**: 2026-03-23
> **Reference Projects**: Cal.com (Calendso), Easy!Appointments, Amelia (WP Booking), SimplyBook.me
> **Target**: Small & Medium Companies (SMC/SME) — salons, clinics, consultancies, studios, service businesses
> **Legend**: ✅ Implemented | ⚠️ Partial | ❌ Missing

---

## 1. Objective

Evaluate whether the Cardlink booking module is comprehensive enough to handle
**all booking & appointment information** for a typical SMC by comparing it
against industry-standard open-source and professional booking platforms
(Cal.com, Easy!Appointments, Amelia, SimplyBook.me).

---

## 2. Current Implementation Summary

Cardlink's booking module currently consists of:

| Component | Count | Details |
|-----------|-------|---------|
| Database tables | 3 | `booking_services`, `booking_availability`, `booking_appointments` |
| API routes | 3 | Services CRUD, Availability bulk-save, Appointments CRUD |
| UI pages | 6 | Dashboard, Services, Availability, Appointments, Calendar, Layout |
| Library utilities | 1 | `booking-store-sync.ts` — bidirectional store sync |
| Notification hooks | 1 | `notifyNewBooking()` on appointment creation |
| i18n languages | 4 | en, zh-CN, zh-TW, zh-HK |

---

## 3. Comprehensive Function List

### Module A — Service / Event Type Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| A1 | Create service with name, description, duration, price | Cal.com, Easy!, Amelia | ✅ | `POST /api/business/booking/services` with all fields |
| A2 | Edit service details | Cal.com, Easy!, Amelia | ✅ | `PUT /api/business/booking/services` |
| A3 | Delete service | Cal.com, Easy!, Amelia | ✅ | `DELETE /api/business/booking/services?id=...` |
| A4 | List all services | Cal.com, Easy!, Amelia | ✅ | `GET /api/business/booking/services` |
| A5 | Toggle service active/inactive | Cal.com, Amelia | ✅ | `is_active` boolean on `booking_services` |
| A6 | Service categories / grouping | Cal.com, Easy!, Amelia | ✅ | `category` text field on service |
| A7 | Max concurrent bookings per slot | Cal.com, SimplyBook | ✅ | `max_concurrent` field (default 1) |
| A8 | Service-specific pricing tiers | Amelia, SimplyBook | ❌ | Single `price` only; no tiered or variable pricing |
| A9 | Service add-ons / extras | Amelia, SimplyBook | ❌ | No add-on services or extras selection |
| A10 | Service images / gallery | Amelia, SimplyBook | ❌ | No image field on `booking_services` |
| A11 | Service buffer time (before/after) | Cal.com, Easy!, Amelia | ❌ | No buffer/padding between appointments |
| A12 | Minimum booking notice (lead time) | Cal.com, Easy!, Amelia | ❌ | No advance notice requirement |
| A13 | Maximum future booking window | Cal.com, Amelia | ❌ | No limit on how far ahead clients can book |
| A14 | Recurring service templates | Amelia, Cal.com | ❌ | No recurring/repeating event type definitions |
| A15 | Group / class bookings (multi-attendee) | Cal.com, Amelia, SimplyBook | ❌ | `max_concurrent` exists but no group booking UI/logic |
| A16 | Service-level custom form fields | Cal.com, Amelia | ❌ | No custom intake questions per service |

### Module B — Availability & Schedule Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| B1 | Weekly recurring availability (day + time range) | Cal.com, Easy!, Amelia | ✅ | `booking_availability` with `day_of_week`, `start_time`, `end_time` |
| B2 | Company-wide availability settings | Easy!, Amelia | ✅ | `service_id IS NULL` filter for company-wide rules |
| B3 | Toggle open/closed per day | Cal.com, Easy! | ✅ | `is_available` boolean per day-of-week slot |
| B4 | Bulk save availability (atomic) | — (best practice) | ✅ | Delete + insert pattern for atomic updates |
| B5 | Service-specific availability overrides | Cal.com, Easy!, Amelia | ⚠️ | Schema supports `service_id` FK but UI only manages company-wide |
| B6 | Date-specific overrides / exceptions | Cal.com, Amelia, SimplyBook | ❌ | No date-specific override (e.g., closed Dec 25) |
| B7 | Public holidays calendar | Easy!, Amelia, SimplyBook | ❌ | No holiday calendar integration or management |
| B8 | Break time slots | Easy!, Amelia | ❌ | No lunch break or mid-day unavailability within a day |
| B9 | Multiple time ranges per day | Cal.com, Easy! | ❌ | Only one start/end per day_of_week; can't do 9-12 + 14-18 |
| B10 | Staff / provider-specific availability | Easy!, Amelia, Cal.com | ❌ | No staff/provider entity; availability is company-level only |
| B11 | Timezone-aware availability | Cal.com, Amelia | ❌ | No timezone field; times are naive (no TZ context) |
| B12 | Vacation / time-off management | Easy!, Amelia | ❌ | No blocked-out date ranges for holidays or vacation |
| B13 | Seasonal / temporary schedule changes | SimplyBook, Amelia | ❌ | No date-bounded schedule variations |

### Module C — Appointment / Booking Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| C1 | Create appointment (admin) | Cal.com, Easy!, Amelia | ✅ | `POST /api/business/booking/appointments` |
| C2 | List appointments with filters | Cal.com, Easy!, Amelia | ✅ | GET with `date_from`, `date_to`, `status` params |
| C3 | Status workflow (pending → confirmed → completed) | Easy!, Amelia | ✅ | 5 statuses: pending, confirmed, cancelled, completed, no_show |
| C4 | Auto-calculate end time from duration | Amelia, SimplyBook | ✅ | API fetches service duration and calculates `end_time` |
| C5 | Customer info capture (name, email, phone) | Cal.com, Easy!, Amelia | ✅ | All 3 fields + optional `customer_user_id` |
| C6 | Appointment notes | Easy!, Amelia | ✅ | `notes` text field on appointment |
| C7 | Price captured at booking time | Amelia, SimplyBook | ✅ | `total_price` populated from service price |
| C8 | Update appointment status | Easy!, Amelia | ✅ | `PUT /api/business/booking/appointments` with status change |
| C9 | Tab-based filtering (All/Today/Upcoming/Past) | — (UX best practice) | ✅ | Frontend tabs with date-based filtering |
| C10 | Appointment rescheduling | Cal.com, Easy!, Amelia | ❌ | No reschedule workflow; must cancel and rebook |
| C11 | Recurring / repeating appointments | Amelia, Cal.com | ❌ | No recurrence rules (daily/weekly/monthly) |
| C12 | Double-booking prevention / conflict check | Cal.com, Easy!, Amelia | ❌ | No server-side overlap validation; can overbook |
| C13 | Waitlist for fully booked slots | SimplyBook, Amelia | ❌ | No waitlist queue |
| C14 | Appointment cancellation reason | Easy!, Amelia | ❌ | No cancellation reason field or tracking |
| C15 | Appointment history / audit log | Cal.com, Amelia | ❌ | No status change history; only current status stored |
| C16 | Assign staff / provider to appointment | Easy!, Amelia | ❌ | No staff entity; all appointments are company-level |
| C17 | Appointment duration override | Cal.com, Amelia | ❌ | Duration always comes from service; no per-appointment override |
| C18 | Batch / bulk appointment operations | Amelia | ❌ | No bulk confirm, cancel, or delete |

### Module D — Customer-Facing Booking (Public Portal)

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| D1 | Public booking page / widget | Cal.com, Easy!, Amelia | ❌ | No public-facing booking page; admin-only CRUD |
| D2 | Self-service appointment creation | Cal.com, Easy!, Amelia | ❌ | Customers cannot book themselves |
| D3 | Available slot calculator (real-time) | Cal.com, Easy!, Amelia | ❌ | No API to return available time slots for a date |
| D4 | Service selection by customer | Cal.com, Easy!, Amelia | ❌ | No service browsing for customers (RLS allows public read) |
| D5 | Customer self-service reschedule | Cal.com, Amelia | ❌ | No customer-initiated rescheduling |
| D6 | Customer self-service cancellation | Cal.com, Amelia, Easy! | ❌ | No customer-initiated cancellation |
| D7 | Booking confirmation page | Cal.com, Easy!, Amelia | ❌ | No post-booking confirmation screen for customers |
| D8 | Embeddable booking widget | Cal.com, Amelia, SimplyBook | ❌ | No embed code or iframe widget |
| D9 | Shareable booking link per service | Cal.com, Amelia | ❌ | No direct booking URL per service |
| D10 | Mobile-responsive booking form | Cal.com, Easy!, Amelia | ❌ | No public form exists (admin UI is responsive) |
| D11 | Customer account / booking history | Amelia, SimplyBook | ❌ | No customer portal to view past/upcoming appointments |
| D12 | Booking terms & cancellation policy display | Amelia, SimplyBook | ❌ | No policy text or agreement checkbox |

### Module E — Notifications & Reminders

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| E1 | Admin notification on new booking | Cal.com, Easy!, Amelia | ✅ | `notifyNewBooking()` creates in-app notification |
| E2 | Email confirmation to customer | Cal.com, Easy!, Amelia | ❌ | No email sent to customer on booking |
| E3 | Email confirmation to admin/staff | Cal.com, Easy!, Amelia | ❌ | Only in-app notification; no email |
| E4 | SMS reminder to customer | Cal.com, Amelia, SimplyBook | ❌ | No SMS integration |
| E5 | Email reminder before appointment | Cal.com, Easy!, Amelia | ❌ | No scheduled reminder (e.g., 24h or 1h before) |
| E6 | Status change notification to customer | Easy!, Amelia | ❌ | No notification when appointment confirmed/cancelled |
| E7 | No-show follow-up notification | Amelia | ❌ | No automated follow-up for no-shows |
| E8 | Cancellation notification to customer | Cal.com, Easy!, Amelia | ❌ | No notification on cancellation |
| E9 | Customizable notification templates | Amelia, Cal.com | ❌ | No template management for notifications |
| E10 | WhatsApp / messaging integration | SimplyBook, Amelia | ❌ | No messaging platform integration |

### Module F — Calendar & Scheduling Views

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| F1 | Day view with hourly grid | Cal.com, Easy!, Amelia | ✅ | 8am–8pm hourly grid with positioned appointment blocks |
| F2 | Week view with daily columns | Cal.com, Easy!, Amelia | ✅ | 7-column grid with up to 3 appointments per day |
| F3 | Navigation (prev/next day/week) | Cal.com, Easy!, Amelia | ✅ | Previous/Next buttons with date shifting |
| F4 | Status-based color coding | Cal.com, Amelia | ✅ | Pending=amber, Confirmed=blue, Completed=green, etc. |
| F5 | Current date highlighting | Cal.com, Easy! | ✅ | Today's date highlighted in week view |
| F6 | Overflow indicator (+N more) | Google Calendar, Cal.com | ✅ | Shows "+N more" when >3 appointments per day |
| F7 | Month view | Cal.com, Easy!, Amelia | ❌ | No month-level calendar view |
| F8 | Drag-and-drop rescheduling | Cal.com, Amelia | ❌ | No drag-and-drop to move appointments |
| F9 | Click-to-create on calendar | Cal.com, Amelia | ❌ | No click-on-slot to create appointment |
| F10 | Staff/resource column view | Easy!, Amelia | ❌ | No side-by-side staff calendars |
| F11 | Mini calendar for quick navigation | Cal.com, Easy! | ❌ | No small month calendar for date jumping |
| F12 | Agenda / list view | Cal.com, Amelia | ❌ | No sequential list-style agenda view |

### Module G — Staff / Provider Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| G1 | Staff / provider profiles | Easy!, Amelia | ❌ | No staff entity; company-level only |
| G2 | Staff-service assignment | Easy!, Amelia, Cal.com | ❌ | No mapping of which staff can perform which services |
| G3 | Staff individual schedules | Easy!, Amelia, Cal.com | ❌ | No per-staff working hours or availability |
| G4 | Staff capacity / workload view | Amelia, Cal.com | ❌ | No visibility into staff utilization |
| G5 | Round-robin assignment | Cal.com | ❌ | No automatic distribution of bookings among staff |
| G6 | Staff breaks / time-off | Easy!, Amelia | ❌ | No staff-level break or vacation management |
| G7 | Staff performance metrics | Amelia | ❌ | No staff booking count, revenue, or rating tracking |

### Module H — Payment & Pricing

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| H1 | Service price captured at booking | Amelia, SimplyBook | ✅ | `total_price` on `booking_appointments` |
| H2 | Online payment at booking time | Cal.com, Amelia, SimplyBook | ❌ | No payment gateway integration (Stripe, PayPal) |
| H3 | Deposit / partial payment collection | Amelia, SimplyBook | ❌ | No deposit workflow |
| H4 | Cancellation fee / no-show charge | Amelia, SimplyBook | ❌ | No penalty fee structure |
| H5 | Coupon / discount codes | Amelia, SimplyBook | ❌ | No promotional code support |
| H6 | Package / bundle pricing | Amelia, SimplyBook | ❌ | No multi-session packages (e.g., "10 sessions for $X") |
| H7 | Invoice generation for bookings | Amelia, SimplyBook | ❌ | No invoice creation for completed appointments |
| H8 | Tax calculation on booking | Amelia | ❌ | No tax configuration for services |
| H9 | Refund processing | Cal.com, Amelia | ❌ | No refund workflow |
| H10 | POS integration for walk-in payment | — (Cardlink opportunity) | ⚠️ | `booking-store-sync.ts` syncs to store but no POS payment trigger |

### Module I — Customer / Client Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| I1 | Customer name, email, phone capture | Easy!, Amelia | ✅ | Fields on `booking_appointments` |
| I2 | Link to authenticated user | Cal.com | ✅ | `customer_user_id` FK to `auth.users` |
| I3 | Customer database / directory | Easy!, Amelia | ❌ | Customers only exist as appointment fields; no dedicated table |
| I4 | Customer booking history view | Amelia, SimplyBook | ❌ | No customer-centric appointment history |
| I5 | CRM integration (contact sync) | Cal.com, Amelia | ❌ | No sync to Cardlink CRM contacts module |
| I6 | Customer notes / preferences | Amelia, SimplyBook | ❌ | No customer profile or preference tracking |
| I7 | Customer loyalty / visit tracking | SimplyBook | ❌ | No visit count or loyalty program |
| I8 | Customer communication log | Amelia | ❌ | No record of messages/emails sent to customer |
| I9 | Duplicate customer detection | Easy!, Amelia | ❌ | No deduplication when same customer books again |

### Module J — Reporting & Analytics

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| J1 | Today's appointment count | Amelia, Easy! | ✅ | Dashboard statistics card |
| J2 | Upcoming appointments count (7-day) | Amelia | ✅ | Dashboard statistics card |
| J3 | Completion rate percentage | Amelia | ✅ | Dashboard statistics calculation |
| J4 | Today's appointments list | Amelia, Easy! | ✅ | Dashboard list with times & statuses |
| J5 | Daily / weekly / monthly booking report | Cal.com, Amelia, Easy! | ❌ | No date-range report generation |
| J6 | Revenue report (by service, period) | Amelia, SimplyBook | ❌ | No revenue tracking or reporting |
| J7 | No-show / cancellation rate report | Amelia, Cal.com | ❌ | No analysis of no-shows or cancellations |
| J8 | Staff utilization report | Amelia, Cal.com | ❌ | No staff exists; no utilization metrics |
| J9 | Peak hours / demand analysis | Amelia, SimplyBook | ❌ | No time-of-day or day-of-week demand insights |
| J10 | Service popularity ranking | Amelia, SimplyBook | ❌ | No ranking of most-booked services |
| J11 | Customer acquisition report | Amelia | ❌ | No new vs. returning customer tracking |
| J12 | CSV / PDF export of reports | Cal.com, Amelia | ❌ | No report export functionality |
| J13 | Dashboard analytics with charts | Amelia, Cal.com | ❌ | Only numeric stats; no visual charts/graphs |

### Module K — Calendar Integration & Sync

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| K1 | Google Calendar sync (2-way) | Cal.com, Easy!, Amelia | ❌ | No external calendar integration |
| K2 | Outlook / Microsoft 365 sync | Cal.com, Amelia | ❌ | No Microsoft calendar sync |
| K3 | Apple Calendar / CalDAV sync | Cal.com | ❌ | No CalDAV support |
| K4 | iCal export (.ics file) | Cal.com, Easy!, Amelia | ❌ | No .ics file generation for appointments |
| K5 | Calendar conflict detection (external) | Cal.com | ❌ | No checking against external calendar events |

### Module L — Communication & Marketing

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| L1 | Post-appointment feedback / review request | Amelia, SimplyBook | ❌ | No feedback collection after completion |
| L2 | Follow-up email campaigns | Amelia, SimplyBook | ❌ | No automated follow-up marketing |
| L3 | Birthday / anniversary messaging | SimplyBook | ❌ | No customer milestone tracking |
| L4 | Promotional campaign scheduling | SimplyBook | ❌ | No marketing campaign tools |
| L5 | Customer satisfaction surveys | Amelia | ❌ | No survey or rating collection |

### Module M — Multi-location & Resource Management

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| M1 | Multiple business locations | Amelia, SimplyBook, Easy! | ❌ | No location entity; single-location only |
| M2 | Room / resource booking | Cal.com, SimplyBook | ❌ | No room or equipment resource management |
| M3 | Location-specific services | Amelia, SimplyBook | ❌ | No location-service mapping |
| M4 | Location-specific availability | Amelia | ❌ | No per-location schedules |

### Module N — Cross-Module Integration

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| N1 | Booking → Store product sync | — (Cardlink-specific) | ✅ | `booking-store-sync.ts` syncs services to store_products |
| N2 | Booking → In-app notification | — (Cardlink-specific) | ✅ | `notifyNewBooking()` on appointment creation |
| N3 | Multi-company tenant isolation | — (Cardlink-specific) | ✅ | `company_id` FK + RLS on all 3 tables |
| N4 | i18n / multi-language support | Cal.com, Easy!, Amelia | ✅ | en, zh-CN, zh-TW, zh-HK translations |
| N5 | Row-Level Security (data isolation) | — (best practice) | ✅ | RLS policies on all booking tables |
| N6 | Public read access for active services | Cal.com, Easy! | ✅ | RLS policy allows SELECT on active services |
| N7 | Booking → Accounting integration | — (Cardlink opportunity) | ❌ | No journal entry on completed appointments |
| N8 | Booking → CRM contact sync | — (Cardlink opportunity) | ❌ | No customer sync to CRM module |
| N9 | Booking → POS payment trigger | — (Cardlink opportunity) | ❌ | Store sync exists but no POS transaction auto-creation |
| N10 | Booking → HR staff linkage | — (Cardlink opportunity) | ❌ | No link between booking providers and HR employees |

### Module O — Configuration & Administration

| # | Function | Reference System | Status | Notes |
|---|----------|-----------------|--------|-------|
| O1 | Booking module dashboard | Amelia, Easy! | ✅ | Overview page with stats, shortcuts, today's appointments |
| O2 | Service management UI | Amelia, Easy! | ✅ | Full CRUD table view |
| O3 | Availability management UI | Easy!, Amelia | ✅ | Weekly schedule editor with time pickers |
| O4 | Appointment management UI with status buttons | Amelia, Easy! | ✅ | Confirm, Cancel, Complete, No-Show buttons |
| O5 | Cancellation policy configuration | Amelia, SimplyBook | ❌ | No cancellation rules (window, fees) |
| O6 | Booking form field configuration | Amelia, Cal.com | ❌ | No custom fields on booking form |
| O7 | Email template customization | Amelia, Easy!, Cal.com | ❌ | No email templates (no emails sent) |
| O8 | Booking widget appearance settings | Cal.com, Amelia | ❌ | No public widget to customize |
| O9 | Auto-confirm vs. manual confirm setting | Easy!, Amelia | ❌ | All appointments start as "pending"; no auto-confirm option |
| O10 | Business timezone configuration | Cal.com, Amelia | ❌ | No timezone setting for the business |

---

## 4. Comprehensive Workflow List

### Workflow 1 — Admin Creates & Manages Services ✅
```
Admin → Services Page → Add Service → Fill form (name, duration, price, category) → Save
Admin → Services Page → Edit/Toggle/Delete service
```
**Status**: ✅ Fully implemented

### Workflow 2 — Admin Configures Availability ⚠️
```
Admin → Availability Page → Set weekly hours (Mon-Fri 09:00-17:00) → Save
```
**Status**: ⚠️ Basic only — no service-specific, date exceptions, breaks, or multi-range support

### Workflow 3 — Admin Creates Appointment ✅
```
Admin → Appointments Page → Select service → Enter customer info → Pick date/time → Save
→ System auto-calculates end time → Notification sent to admins
```
**Status**: ✅ Fully implemented

### Workflow 4 — Appointment Status Lifecycle ✅
```
Pending → [Confirm] → Confirmed → [Complete] → Completed
Pending → [Cancel] → Cancelled
Confirmed → [Cancel] → Cancelled
Any → [No Show] → No Show
```
**Status**: ✅ Fully implemented

### Workflow 5 — Calendar Visualization ✅
```
Admin → Calendar Page → Day View (hourly grid) or Week View (daily columns)
→ Navigate prev/next → Click appointment to see details
```
**Status**: ✅ Fully implemented (day + week views)

### Workflow 6 — Customer Self-Service Booking ❌
```
Customer → Public booking page → Browse services → Select date/time → Enter info → Confirm
→ Customer receives email confirmation → Appointment appears in admin calendar
```
**Status**: ❌ Not implemented — no public booking interface exists

### Workflow 7 — Booking Reminders & Follow-up ❌
```
System → 24h before appointment → Send email/SMS reminder to customer
System → After appointment → Send follow-up / feedback request
System → On no-show → Send follow-up message
```
**Status**: ❌ Not implemented — no reminder or follow-up system

### Workflow 8 — Payment Collection ❌
```
Customer → Book appointment → Pay online (Stripe/PayPal) → Booking confirmed
OR Customer → Complete appointment → Pay at checkout (POS) → Mark as paid
```
**Status**: ❌ Not implemented — no payment integration

### Workflow 9 — Reschedule / Modify Appointment ❌
```
Customer/Admin → Select appointment → Reschedule → Pick new date/time → Confirm
→ System sends rescheduling notification to both parties
```
**Status**: ❌ Not implemented — no reschedule workflow

### Workflow 10 — Reporting & Business Insights ❌
```
Admin → Reports page → Select date range → View bookings count, revenue, no-show rate
→ Export as CSV/PDF → Use insights to optimize schedule
```
**Status**: ❌ Not implemented — only basic dashboard counts exist

### Workflow 11 — Staff Assignment & Management ❌
```
Admin → Add staff members → Assign services to staff → Set staff availability
→ Bookings auto-assigned or manually routed → Staff sees own calendar
```
**Status**: ❌ Not implemented — no staff/provider entity

### Workflow 12 — External Calendar Sync ❌
```
Admin → Connect Google Calendar → Appointments sync bidirectionally
→ External events block availability → No double bookings
```
**Status**: ❌ Not implemented — no calendar integration

---

## 5. Coverage Summary

### By Category

| Category | Total Functions | ✅ Implemented | ⚠️ Partial | ❌ Missing | Coverage |
|----------|----------------|----------------|------------|-----------|----------|
| A. Service Management | 16 | 7 | 0 | 9 | 44% |
| B. Availability Management | 13 | 4 | 1 | 8 | 35% |
| C. Appointment Management | 18 | 9 | 0 | 9 | 50% |
| D. Customer-Facing Booking | 12 | 0 | 0 | 12 | 0% |
| E. Notifications & Reminders | 10 | 1 | 0 | 9 | 10% |
| F. Calendar Views | 12 | 6 | 0 | 6 | 50% |
| G. Staff / Provider Mgmt | 7 | 0 | 0 | 7 | 0% |
| H. Payment & Pricing | 10 | 1 | 1 | 8 | 15% |
| I. Customer Management | 9 | 2 | 0 | 7 | 22% |
| J. Reporting & Analytics | 13 | 4 | 0 | 9 | 31% |
| K. Calendar Integration | 5 | 0 | 0 | 5 | 0% |
| L. Communication & Marketing | 5 | 0 | 0 | 5 | 0% |
| M. Multi-location & Resources | 4 | 0 | 0 | 4 | 0% |
| N. Cross-Module Integration | 10 | 6 | 0 | 4 | 60% |
| O. Configuration & Admin | 10 | 4 | 0 | 6 | 40% |
| **TOTAL** | **154** | **44** | **2** | **108** | **30%** |

### By Workflow

| # | Workflow | Status |
|---|---------|--------|
| 1 | Admin Creates & Manages Services | ✅ Complete |
| 2 | Admin Configures Availability | ⚠️ Basic only |
| 3 | Admin Creates Appointment | ✅ Complete |
| 4 | Appointment Status Lifecycle | ✅ Complete |
| 5 | Calendar Visualization | ✅ Complete |
| 6 | Customer Self-Service Booking | ❌ Missing |
| 7 | Booking Reminders & Follow-up | ❌ Missing |
| 8 | Payment Collection | ❌ Missing |
| 9 | Reschedule / Modify Appointment | ❌ Missing |
| 10 | Reporting & Business Insights | ❌ Missing |
| 11 | Staff Assignment & Management | ❌ Missing |
| 12 | External Calendar Sync | ❌ Missing |

**Workflow coverage**: 4 of 12 workflows operational (33%)

---

## 6. What Cardlink Does Well

Despite the gaps, the booking module has strong foundations:

| Strength | Detail |
|----------|--------|
| **Clean database schema** | 3 well-designed tables with proper FKs, RLS policies, and reasonable defaults |
| **Multi-tenant isolation** | All tables scoped by `company_id` with RLS — ready for multi-tenant SaaS |
| **Status workflow** | 5-state appointment lifecycle (pending/confirmed/cancelled/completed/no_show) |
| **Calendar views** | Both day (hourly grid) and week view with color-coded statuses |
| **Cross-module sync** | Bidirectional sync between booking services and store products |
| **i18n support** | Full translation coverage in 4 Chinese dialects + English |
| **Notification hook** | In-app notification on new booking via `notifyNewBooking()` |
| **Auto-calculations** | End time auto-calculated from service duration; price auto-populated |
| **Public service read** | RLS policy allows anonymous users to read active services |
| **Atomic availability save** | Delete + insert pattern ensures no partial state |

---

## 7. Priority-Based Missing Feature Roadmap

### Phase 1 — Critical (P0) — Week 1–2
> **Minimum viable for customer-facing use**

1. **Double-booking prevention** (C12) — Server-side overlap check before insert
2. **Available slot calculator API** (D3) — `GET /api/public/booking/slots?service_id=&date=`
3. **Public booking page** (D1, D2) — Customer-facing booking form
4. **Booking confirmation to customer** (E2) — Email on successful booking
5. **Auto-confirm option** (O9) — Configurable auto-confirm vs. manual approval
6. **Appointment rescheduling** (C10) — Date/time change with notification

**Acceptance criteria**: A customer can visit a public URL, see available slots, book an appointment, and receive an email confirmation.
**Test checkpoint**: Public page → select service → see real-time availability → book → receive email → appointment appears in admin calendar.

### Phase 2 — Important (P1) — Weeks 3–4
> **Professional SMC features**

7. **Service buffer time** (A11) — Before/after padding for preparation
8. **Minimum booking notice** (A12) — e.g., "Must book 2 hours in advance"
9. **Email reminder before appointment** (E5) — Scheduled 24h/1h reminder
10. **Status change notification** (E6) — Email customer on confirm/cancel
11. **Cancellation reason tracking** (C14) — Record why appointments are cancelled
12. **Date-specific availability overrides** (B6) — Holiday closures, special hours
13. **Break time slots** (B8) — Lunch breaks within availability
14. **Monthly calendar view** (F7) — Month-level overview
15. **Booking revenue report** (J6) — Revenue by service and time period
16. **Daily booking report** (J5) — Date-range appointment summary

**Acceptance criteria**: Each feature has API endpoint + UI + at least one notification.
**Test checkpoint**: Book appointment → receive reminder email → admin cancels → customer gets cancellation email with reason → revenue appears in report.

### Phase 3 — Valuable (P2) — Weeks 5–8
> **Competitive differentiators**

17. **Staff / provider management** (G1–G6) — Staff profiles, schedules, service assignments
18. **Online payment** (H2) — Stripe integration for upfront payment
19. **Customer database** (I3) — Dedicated customer entity with history
20. **CRM integration** (I5, N8) — Sync booking customers to CRM contacts
21. **Accounting integration** (N7) — Journal entry on completed paid appointments
22. **POS payment trigger** (N9) — Create POS transaction from completed booking
23. **Google Calendar sync** (K1) — 2-way appointment sync
24. **Embeddable widget** (D8) — Iframe/JS snippet for external websites
25. **CSV/PDF report export** (J12) — Export booking data

**Acceptance criteria**: Each integration produces verifiable data in the target module.
**Test checkpoint**: Complete appointment → payment processed via Stripe → journal entry created → customer appears in CRM → appointment appears in Google Calendar.

### Phase 4 — Advanced (P3) — Weeks 9+
> **Enterprise-grade features**

26. Recurring appointments
27. Group / class bookings
28. Multi-location support
29. Custom booking form fields
30. Customer loyalty program
31. Marketing campaigns
32. Waitlist management
33. Drag-and-drop calendar rescheduling

**Acceptance criteria**: Each feature has CRUD operations, API endpoints, and UI integration.
**Test checkpoint**: Create recurring weekly appointment → verify all instances created → customer joins group class → confirm at specific location.

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Double-booking without conflict check | Customer shows up to overbooked slot | P0: Implement server-side overlap validation immediately |
| No public booking = admin bottleneck | Staff manually enters every booking | P0: Public booking page is highest priority |
| No email notifications | Customer forgets appointment | P0/P1: Email confirmation + reminders reduce no-shows by 30-50% |
| No payment collection | Revenue leakage, no-show risk | P2: Deposit collection at booking reduces no-shows |
| Calendar sync complexity | Google/Outlook API maintenance burden | Start with iCal export (.ics) before full 2-way sync |
| Staff management adds schema complexity | Migration risk to existing data | Design staff entity to be optional; backwards-compatible |

### Scope Exclusions (Out of Scope for All Phases)

- AI-powered scheduling optimization
- Voice assistant booking (Alexa, Google Assistant)
- Biometric check-in at physical location
- Third-party marketplace listing (e.g., Yelp, Google Reserve)
- Video conferencing auto-setup (Zoom, Google Meet)
- Multi-company consolidated booking reporting

---

## 8. Reference: Open-Source Booking Projects Compared

| Feature | Cal.com | Easy!Appointments | Amelia | SimplyBook | **Cardlink** |
|---------|---------|-------------------|--------|------------|--------------|
| Service CRUD | ✅ | ✅ | ✅ | ✅ | ✅ |
| Availability Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Appointment Booking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Status Workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendar Views | ✅ | ✅ | ✅ | ✅ | ✅ (day+week) |
| Public Booking Page | ✅ | ✅ | ✅ | ✅ | ❌ |
| Conflict Detection | ✅ | ✅ | ✅ | ✅ | ❌ |
| Email Notifications | ✅ | ✅ | ✅ | ✅ | ❌ |
| SMS Reminders | ✅ | ✅ (add-on) | ✅ | ✅ | ❌ |
| Staff Management | ✅ | ✅ | ✅ | ✅ | ❌ |
| Online Payments | ✅ | ✅ (add-on) | ✅ | ✅ | ❌ |
| Google Calendar Sync | ✅ | ✅ | ✅ | ✅ | ❌ |
| Customer Portal | ❌ | ❌ | ✅ | ✅ | ❌ |
| Reporting / Analytics | ✅ | ❌ | ✅ | ✅ | ⚠️ (basic stats) |
| Recurring Appointments | ✅ | ❌ | ✅ | ✅ | ❌ |
| Group Bookings | ✅ | ✅ | ✅ | ✅ | ❌ |
| Multi-location | ❌ | ❌ | ✅ | ✅ | ❌ |
| Custom Fields | ✅ | ❌ | ✅ | ✅ | ❌ |
| Embeddable Widget | ✅ | ❌ | ✅ | ✅ | ❌ |
| Multi-language | ✅ (65+) | ✅ (20+) | ✅ (20+) | ✅ | ✅ (4) |
| Self-hosted | ✅ | ✅ | ✅ (WP) | ❌ | ✅ |
| Multi-tenant | ❌ | ❌ | ❌ | ❌ | ✅ |
| Cross-module Integration | ❌ | ❌ | ❌ | ❌ | ✅ (store sync) |

---

## 9. SMC Readiness Assessment

### Verdict: ⚠️ **Admin Tool Only — Not Yet SMC-Ready for Customer-Facing Use**

The Cardlink booking module currently functions as an **internal appointment tracker**
for business administrators. It handles the core admin-side CRUD operations well
(services, availability, appointments, calendar views) but **lacks the customer-facing
capabilities** that professional booking systems provide.

### Readiness Scorecard

| Area | Coverage | Status |
|------|----------|--------|
| Service management | **44%** | ✅ Core CRUD solid; missing advanced features (buffers, add-ons, images) |
| Availability management | **35%** | ⚠️ Basic weekly hours only; no breaks, exceptions, or per-staff |
| Appointment management | **50%** | ✅ Good admin workflow; missing rescheduling and conflict detection |
| Customer-facing booking | **0%** | ❌ **Critical gap** — no public booking interface |
| Notifications & reminders | **10%** | ❌ **Critical gap** — only admin in-app notification |
| Calendar views | **50%** | ✅ Day + week views functional; month view missing |
| Staff management | **0%** | ❌ No staff entity at all |
| Payment integration | **15%** | ❌ Price captured but no payment collection |
| Customer management | **22%** | ⚠️ Basic capture; no dedicated customer entity |
| Reporting & analytics | **31%** | ⚠️ Dashboard stats only; no detailed reports |
| Calendar integration | **0%** | ❌ No external calendar sync |
| Cross-module integration | **60%** | ✅ Store sync + notifications + RLS + i18n |
| **Overall** | **30%** | ⚠️ **Admin tool; not customer-facing ready** |

### To Reach SMC-Ready (≈70%):

The **6 critical P0 features** would bring coverage from 30% to approximately **45%** and
enable basic customer-facing operation. Adding the **10 P1 features** would reach
approximately **65-70%**, which is the minimum threshold for a professional SMC booking system.

### Minimum Viable Professional Booking System Requires:

| Must-Have Feature | Current | Priority |
|-------------------|---------|----------|
| Public booking page | ❌ | P0 |
| Double-booking prevention | ❌ | P0 |
| Available slot calculator | ❌ | P0 |
| Email confirmations | ❌ | P0 |
| Appointment rescheduling | ❌ | P0 |
| Email reminders | ❌ | P1 |
| Cancellation tracking | ❌ | P1 |
| Holiday/exception dates | ❌ | P1 |
| Basic booking reports | ❌ | P1 |
| Staff management | ❌ | P2 |
| Online payments | ❌ | P2 |
| Calendar sync | ❌ | P2 |

---

## 10. References

- [Cal.com — Open Source Scheduling Infrastructure](https://cal.com/)
- [Easy!Appointments — Open Source Booking](https://easyappointments.org/)
- [Amelia — WordPress Booking Plugin](https://wpamelia.com/features/)
- [SimplyBook.me — Professional Booking System](https://simplybook.me/)
- [12 Scheduling Software Features That Small Businesses Need — BookedIn](https://bookedin.com/blog/must-have-scheduling-software-features/)
- [Best Scheduling Apps for Small Business — Calendly Blog](https://calendly.com/blog/appointment-scheduling-software)
