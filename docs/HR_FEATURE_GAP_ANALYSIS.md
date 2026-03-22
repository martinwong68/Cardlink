# HR Module — Feature Gap Analysis for SME

> **Date**: 2026-03-22
> **Reference Projects**: OrangeHRM, Odoo HR, ERPNext HR, Sentrifugo
> **Target**: Small & Medium Companies (SMC/SME, typically 5–200 employees)
> **Legend**: ✅ Implemented | ⚠️ Partial | ❌ Missing

---

## 1. Comprehensive Function List

### Module A — Employee Information Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| A1 | Centralized employee database (name, email, phone) | ✅ | `hr_employees` table with full CRUD |
| A2 | Job details (position, department) | ✅ | Free-text fields for position & department |
| A3 | Employment type tracking (full-time, part-time, contract) | ✅ | Enum with 3 types |
| A4 | Salary & compensation records | ✅ | `salary` + `salary_period` (monthly/hourly) |
| A5 | Employee status lifecycle (active, inactive, terminated) | ✅ | 3-state status with toggle |
| A6 | Start date / end date tracking | ✅ | Both fields present |
| A7 | Employee avatar / photo | ✅ | `avatar_url` field (initials fallback in UI) |
| A8 | Multi-step employee creation form | ✅ | 3-step wizard: Personal → Job → Compensation |
| A9 | Emergency contact information | ❌ | No emergency contact fields |
| A10 | Address / location details | ❌ | No home address or work location fields |
| A11 | National ID / tax number | ❌ | No government ID, tax ID, or passport fields |
| A12 | Bank account details (for payroll) | ❌ | No bank account information stored |
| A13 | Employee documents storage | ❌ | No file upload for contracts, certificates, IDs |
| A14 | Custom fields / additional attributes | ❌ | No extensible fields or metadata JSON |
| A15 | Employee notes / activity log | ❌ | No manager notes or activity history |
| A16 | Multiple job history / promotion tracking | ❌ | No historical position/salary records |
| A17 | Reporting manager / supervisor assignment | ❌ | No manager hierarchy field |

### Module B — Leave Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| B1 | Leave request submission | ✅ | Form with employee, type, dates, reason |
| B2 | Leave type categories | ✅ | 5 types: Annual, Sick, Unpaid, Maternity, Other |
| B3 | Leave approval workflow (pending → approved/rejected) | ✅ | Admin approve/reject with `approved_by` tracking |
| B4 | Auto-calculation of leave days | ✅ | Inclusive date range calculation |
| B5 | Leave request status tabs (pending/approved/rejected) | ✅ | Tab-based filtering on leave page |
| B6 | Admin notification on new leave request | ✅ | System notification sent to company admins |
| B7 | Leave balance / quota management | ❌ | No annual entitlement tracking (e.g., 14 days/year) |
| B8 | Leave balance deduction on approval | ❌ | No auto-deduction from balance when approved |
| B9 | Leave accrual rules | ❌ | No monthly/yearly accrual configuration |
| B10 | Leave carry-over policies | ❌ | No year-end carry-over or expiry rules |
| B11 | Public holidays calendar | ❌ | No company or region-specific holiday calendar |
| B12 | Leave report / analytics | ❌ | No summary reports by employee, type, or period |
| B13 | Paternity leave type | ❌ | Only Annual, Sick, Unpaid, Maternity, Other |
| B14 | Compensatory / replacement leave | ❌ | No comp-off for overtime or weekend work |
| B15 | Half-day leave requests | ❌ | No half-day option (minimum 1 full day) |
| B16 | Leave cancellation by employee | ❌ | No workflow for employee to cancel submitted leave |
| B17 | Team leave calendar view | ❌ | No calendar visualization of team availability |

### Module C — Attendance & Time Tracking

| # | Function | Status | Notes |
|---|----------|--------|-------|
| C1 | Clock in / clock out | ✅ | Timestamp recording with auto hours calculation |
| C2 | Daily attendance status (present, absent, late, half-day) | ✅ | 4 status types with color-coded badges |
| C3 | Date navigation for attendance view | ✅ | Date picker with prev/next day buttons |
| C4 | Daily attendance summary cards | ✅ | Present, Absent, Late counts |
| C5 | Auto-calculation of hours worked | ✅ | Rounded to 2 decimal places |
| C6 | Unique attendance per employee per day | ✅ | DB-level UNIQUE constraint |
| C7 | Manual status override | ✅ | Admin can mark absent/late/half_day |
| C8 | Shift scheduling / roster management | ❌ | No shift definitions or employee-shift assignment |
| C9 | Overtime tracking with rules | ❌ | No overtime threshold or auto-flagging |
| C10 | Break time tracking | ❌ | No lunch/break recording |
| C11 | Weekly / monthly attendance summary | ❌ | Only daily view, no aggregated reports |
| C12 | Attendance regularization requests | ❌ | No employee self-correction workflow |
| C13 | Geolocation / IP-based attendance | ❌ | No location verification for remote workers |
| C14 | Biometric / device integration | ❌ | No external device integration support |
| C15 | Late arrival alerts / notifications | ❌ | No automated late alerts |
| C16 | Attendance policy configuration | ❌ | No configurable work hours, grace periods |
| C17 | Employee self-service clock in/out | ❌ | Only admin can clock in/out (no employee portal) |

### Module D — Payroll Processing

| # | Function | Status | Notes |
|---|----------|--------|-------|
| D1 | Payroll generation for a period | ✅ | Auto-generates records for all active employees |
| D2 | Basic salary from employee records | ✅ | Copies `salary` field at generation time |
| D3 | Overtime, deductions, allowances fields | ✅ | Individual numeric fields with manual adjustment |
| D4 | Net pay calculation | ✅ | Adjustable before approval |
| D5 | Payroll status lifecycle (draft → approved → paid) | ✅ | 3-stage workflow with bulk actions |
| D6 | Bulk approve / bulk mark paid | ✅ | Batch operations on all records in period |
| D7 | Payroll period summary cards | ✅ | Draft/Approved/Paid counts |
| D8 | Payslip generation (PDF) | ❌ | No downloadable payslip for employees |
| D9 | Tax calculation (income tax, social security) | ❌ | No tax templates or auto-deduction rules |
| D10 | Salary structure / components template | ❌ | No reusable salary structure definitions |
| D11 | Statutory compliance (EPF, SOCSO, EIS, PCB for MY) | ❌ | No country-specific statutory deduction support |
| D12 | Expense reimbursement integration | ❌ | No expense claim linked to payroll |
| D13 | Loan / advance management | ❌ | No salary advance or loan deduction tracking |
| D14 | Payroll reports & analytics | ❌ | No period-over-period comparison or summaries |
| D15 | Bank payment file generation | ❌ | No export for bank transfer files |
| D16 | Attendance-linked payroll (hourly workers) | ❌ | No auto-calculation from attendance hours |
| D17 | Year-end tax forms (EA form, etc.) | ❌ | No annual tax documentation generation |

### Module E — Recruitment & Applicant Tracking (ATS)

| # | Function | Status | Notes |
|---|----------|--------|-------|
| E1 | Job posting creation & management | ❌ | Not implemented |
| E2 | Application form / career page | ❌ | Not implemented |
| E3 | Resume / CV upload & parsing | ❌ | Not implemented |
| E4 | Candidate pipeline tracking | ❌ | Not implemented |
| E5 | Interview scheduling | ❌ | Not implemented |
| E6 | Offer letter generation | ❌ | Not implemented |
| E7 | Recruitment analytics | ❌ | Not implemented |

### Module F — Onboarding & Offboarding

| # | Function | Status | Notes |
|---|----------|--------|-------|
| F1 | Onboarding checklist for new hires | ❌ | Not implemented |
| F2 | Document collection workflow | ❌ | Not implemented |
| F3 | IT provisioning tasks | ❌ | Not implemented |
| F4 | Welcome packet / orientation info | ❌ | Not implemented |
| F5 | Offboarding checklist (exit interview, asset return) | ❌ | Not implemented |
| F6 | Final settlement calculation | ❌ | Not implemented |

### Module G — Performance Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| G1 | Goal setting & tracking (KPIs/OKRs) | ❌ | Not implemented |
| G2 | Performance review cycles | ❌ | Not implemented |
| G3 | 360-degree feedback | ❌ | Not implemented |
| G4 | Self-appraisal forms | ❌ | Not implemented |
| G5 | Performance ratings & history | ❌ | Not implemented |
| G6 | Performance improvement plans (PIP) | ❌ | Not implemented |

### Module H — Training & Development (LMS)

| # | Function | Status | Notes |
|---|----------|--------|-------|
| H1 | Training course catalog | ❌ | Not implemented |
| H2 | Course enrollment & tracking | ❌ | Not implemented |
| H3 | Training completion certificates | ❌ | Not implemented |
| H4 | Skills matrix / competency tracking | ❌ | Not implemented |
| H5 | Training budget management | ❌ | Not implemented |

### Module I — Employee Self-Service Portal

| # | Function | Status | Notes |
|---|----------|--------|-------|
| I1 | View own profile & update personal info | ❌ | Admin-only access currently |
| I2 | View own payslips | ❌ | Not implemented |
| I3 | Submit leave requests (by employee) | ❌ | Only admin can submit on behalf of employee |
| I4 | View own attendance records | ❌ | Not implemented |
| I5 | View own leave balance | ❌ | Not implemented |
| I6 | Self-service clock in/out | ❌ | Not implemented |

### Module J — Organization Structure

| # | Function | Status | Notes |
|---|----------|--------|-------|
| J1 | Organization chart (visual hierarchy) | ❌ | Not implemented |
| J2 | Department management (CRUD) | ❌ | Department is free-text, not a managed entity |
| J3 | Position / job title management | ❌ | Position is free-text, not a managed entity |
| J4 | Team / group management | ❌ | Not implemented |
| J5 | Reporting line configuration | ❌ | No manager/subordinate relationships |

### Module K — HR Reports & Analytics

| # | Function | Status | Notes |
|---|----------|--------|-------|
| K1 | Headcount reports | ❌ | Only basic active count on dashboard |
| K2 | Turnover / attrition reports | ❌ | Not implemented |
| K3 | Attendance summary reports | ❌ | Not implemented |
| K4 | Leave utilization reports | ❌ | Not implemented |
| K5 | Payroll cost reports | ❌ | Not implemented |
| K6 | Department-wise analytics | ❌ | Not implemented |
| K7 | Custom report builder | ❌ | Not implemented |

### Module L — Compliance & Document Management

| # | Function | Status | Notes |
|---|----------|--------|-------|
| L1 | HR policy documentation | ❌ | Not implemented |
| L2 | Employee handbook hosting | ❌ | Not implemented |
| L3 | Contract management & expiry alerts | ❌ | No contract tracking or renewal alerts |
| L4 | Audit trail for HR actions | ❌ | No change history on employee records |
| L5 | Regulatory compliance tracking | ❌ | Not implemented |
| L6 | Data retention & GDPR compliance | ❌ | No data retention policies |

### Module M — Benefits Administration

| # | Function | Status | Notes |
|---|----------|--------|-------|
| M1 | Insurance enrollment & management | ❌ | Not implemented |
| M2 | Retirement / pension tracking | ❌ | Not implemented |
| M3 | Wellness program management | ❌ | Not implemented |
| M4 | Employee perks / benefits catalog | ❌ | Not implemented |

### Module N — Communication & Engagement

| # | Function | Status | Notes |
|---|----------|--------|-------|
| N1 | Company-wide announcements | ❌ | Not in HR context (business notifications exist separately) |
| N2 | Employee surveys & feedback | ❌ | Not implemented |
| N3 | Recognition / awards system | ❌ | Not implemented |
| N4 | Internal messaging | ❌ | Not implemented |

---

## 2. Workflow Comparison

### Workflows Currently Implemented ✅

| # | Workflow | Description | Status |
|---|----------|-------------|--------|
| W1 | Employee Creation | 3-step wizard: Personal → Job Details → Compensation → Save | ✅ |
| W2 | Employee Status Toggle | Cycle through active ↔ inactive ↔ terminated | ✅ |
| W3 | Employee Edit/Delete | Full record update or permanent deletion | ✅ |
| W4 | Leave Request Submission | Select employee → Choose type & dates → Submit | ✅ |
| W5 | Leave Approval | Admin reviews → Approve or Reject → Notification | ✅ |
| W6 | Daily Clock In/Out | Admin clicks Clock In → Employee works → Admin clicks Clock Out | ✅ |
| W7 | Manual Attendance Status | Admin marks employee as absent/late/half_day | ✅ |
| W8 | Payroll Generation | Select month → Generate for all active employees | ✅ |
| W9 | Payroll Adjustment | Edit overtime/deductions/allowances per employee | ✅ |
| W10 | Payroll Approval & Payment | Bulk Approve → Bulk Mark Paid | ✅ |

### Workflows Missing ❌

| # | Workflow | Description | Priority for SME |
|---|----------|-------------|-----------------|
| W11 | Employee Onboarding | Checklist-driven setup: docs, IT access, orientation | 🟡 Medium |
| W12 | Employee Offboarding | Exit interview, asset return, final settlement, access revocation | 🟡 Medium |
| W13 | Leave Balance Management | Annual entitlement → Accrual → Deduction → Carry-over | 🔴 High |
| W14 | Leave Cancellation | Employee requests cancellation → Admin approves | 🟡 Medium |
| W15 | Attendance Regularization | Employee requests correction → Manager approves | 🟡 Medium |
| W16 | Shift Scheduling | Define shifts → Assign employees → Roster calendar | 🟢 Low |
| W17 | Overtime Approval | Flag overtime hours → Manager review → Link to payroll | 🟡 Medium |
| W18 | Payslip Distribution | Generate PDF payslips → Employee views/downloads | 🔴 High |
| W19 | Tax Calculation | Apply tax rules → Calculate statutory deductions → Net pay | 🔴 High |
| W20 | Recruitment Pipeline | Post job → Receive applications → Interview → Offer → Hire | 🟢 Low |
| W21 | Performance Review Cycle | Set goals → Mid-year review → Annual appraisal → Rating | 🟢 Low |
| W22 | Training Assignment | Assign course → Track progress → Completion certificate | 🟢 Low |
| W23 | Employee Self-Service | Employee logs in → Views profile, payslips, leave balance | 🔴 High |
| W24 | HR Reporting | Generate headcount, turnover, payroll cost, attendance reports | 🟡 Medium |
| W25 | Contract Renewal Alert | Track contract expiry → Automated reminders → Renewal action | 🟡 Medium |

---

## 3. Summary Scorecard

### By Module

| Module | Total Functions | Implemented | Partial | Missing | Coverage |
|--------|----------------|-------------|---------|---------|----------|
| A. Employee Information | 17 | 8 | 0 | 9 | 47% |
| B. Leave Management | 17 | 6 | 0 | 11 | 35% |
| C. Attendance & Time | 17 | 7 | 0 | 10 | 41% |
| D. Payroll Processing | 17 | 7 | 0 | 10 | 41% |
| E. Recruitment (ATS) | 7 | 0 | 0 | 7 | 0% |
| F. Onboarding / Offboarding | 6 | 0 | 0 | 6 | 0% |
| G. Performance Management | 6 | 0 | 0 | 6 | 0% |
| H. Training & Development | 5 | 0 | 0 | 5 | 0% |
| I. Employee Self-Service | 6 | 0 | 0 | 6 | 0% |
| J. Organization Structure | 5 | 0 | 0 | 5 | 0% |
| K. HR Reports & Analytics | 7 | 0 | 0 | 7 | 0% |
| L. Compliance & Documents | 6 | 0 | 0 | 6 | 0% |
| M. Benefits Administration | 4 | 0 | 0 | 4 | 0% |
| N. Communication & Engagement | 4 | 0 | 0 | 4 | 0% |
| **TOTAL** | **124** | **28** | **0** | **96** | **23%** |

### By Workflow

| Category | Total | Implemented | Missing |
|----------|-------|-------------|---------|
| Core Workflows | 10 | 10 | 0 |
| Extended Workflows | 15 | 0 | 15 |
| **TOTAL** | **25** | **10** | **15** |

---

## 4. Assessment: Is the App Comprehensive Enough for SME?

### Current State

The Cardlink HR module implements the **4 foundational pillars** that every HR system needs:

1. ✅ **Employee Records** — Core CRUD with status management
2. ✅ **Leave Management** — Request & approval workflow
3. ✅ **Attendance Tracking** — Clock in/out with daily view
4. ✅ **Payroll Processing** — Generation, adjustment, approval, payment

These 4 modules cover the minimum viable HR operations and are well-implemented with proper database design, API endpoints, multi-language support, and a clean UI.

### Verdict: Functional but NOT Comprehensive

**For a very small company (< 10 employees):** The current system is **adequate** for day-to-day HR operations. A small team can manage without advanced features.

**For a proper SME (10–200 employees):** The current system has **critical gaps** that would need to be addressed:

### 🔴 Critical Missing Features (Must-Have for SME)

These features are considered essential by all major open-source HR systems and are needed for any company managing more than a handful of employees:

| Priority | Feature | Why It's Critical |
|----------|---------|-------------------|
| 🔴 P0 | **Leave balance / quota management** (B7-B10) | Without leave balances, there's no way to enforce entitlements. Admins must manually track how many days each employee has remaining. This is unsustainable beyond 10 employees. |
| 🔴 P0 | **Payslip generation (PDF)** (D8) | Employees need documented proof of salary payments. This is a legal requirement in most jurisdictions. |
| 🔴 P0 | **Tax / statutory deductions** (D9, D11) | Payroll without tax calculation is incomplete. SMEs are legally required to withhold and remit taxes (e.g., PCB, EPF, SOCSO in Malaysia). |
| 🔴 P0 | **Employee self-service portal** (I1-I6) | HR staff cannot clock in/out and submit leave for every employee. Employees need a self-service portal to manage their own requests. |
| 🔴 P1 | **Employee documents storage** (A13) | Employment contracts, IDs, certifications need to be stored alongside employee records for compliance and reference. |
| 🔴 P1 | **Emergency contact information** (A9) | Required by labor laws in most countries and essential for workplace safety. |
| 🔴 P1 | **Bank account details** (A12) | Necessary for direct salary payments; currently no way to record where to pay employees. |
| 🔴 P1 | **HR reporting / analytics** (K1-K6) | Without reports, management cannot make data-driven decisions about workforce planning, costs, or compliance. |

### 🟡 Important Missing Features (Recommended for SME)

These features are present in most professional HR systems and expected by growing companies:

| Priority | Feature | Benefit |
|----------|---------|---------|
| 🟡 P2 | Onboarding / offboarding checklists (F1-F6) | Ensures consistent employee lifecycle management |
| 🟡 P2 | Department & position management (J2-J3) | Structured data instead of free-text enables filtering and org charts |
| 🟡 P2 | Reporting manager hierarchy (A17) | Enables cascading approvals and organizational visibility |
| 🟡 P2 | Public holidays calendar (B11) | Prevents leave approval on already-off days and accurate payroll |
| 🟡 P2 | Overtime tracking with rules (C9) | Automates overtime calculation and compliance with labor law |
| 🟡 P2 | Leave cancellation workflow (B16) | Employees need to be able to cancel incorrect submissions |
| 🟡 P2 | Audit trail for HR actions (L4) | Legal requirement for tracking changes to employee records |
| 🟡 P2 | Contract management & expiry alerts (L3) | Contract employees need renewal tracking |

### 🟢 Nice-to-Have Features (Future Roadmap)

These features are typically found in enterprise HR systems and can be deferred for SME:

| Priority | Feature | When to Add |
|----------|---------|-------------|
| 🟢 P3 | Recruitment & ATS (E1-E7) | When hiring volume increases |
| 🟢 P3 | Performance management (G1-G6) | When the company formalizes review processes |
| 🟢 P3 | Training & LMS (H1-H5) | When training programs are established |
| 🟢 P3 | Benefits administration (M1-M4) | When benefits package becomes complex |
| 🟢 P3 | Employee surveys & engagement (N1-N4) | When company culture initiatives begin |
| 🟢 P3 | Geolocation attendance (C13) | When remote work tracking is needed |
| 🟢 P3 | Org chart visualization (J1) | When company structure becomes complex |

---

## 5. Recommended Implementation Roadmap

### Phase 1 — Critical Gaps (P0) — Weeks 1-3
> Make the HR module legally compliant and self-service ready

1. **Leave balance management** — Add entitlement per leave type, auto-deduction on approval, balance display
2. **Employee self-service portal** — Employee login → view profile, submit leave, clock in/out, view payslips
3. **Tax & statutory deductions** — Configurable tax rules, auto-deduction in payroll
4. **Payslip PDF generation** — Generate and download payslip per employee per period

### Phase 2 — Important Enhancements (P1) — Weeks 4-6
> Round out employee data and enable management reporting

5. **Extended employee fields** — Emergency contact, address, national ID, bank account
6. **Document management** — Upload/download employee documents (contracts, IDs, certs)
7. **HR reports dashboard** — Headcount, attendance summary, payroll cost, leave utilization
8. **Public holidays calendar** — Company-level holiday management

### Phase 3 — Operational Excellence (P2) — Weeks 7-10
> Streamline HR operations and improve compliance

9. **Department & position management** — CRUD for departments and positions as structured data
10. **Reporting manager hierarchy** — Manager field on employee, cascading approvals
11. **Onboarding / offboarding checklists** — Task-based workflows for employee lifecycle
12. **Overtime tracking** — Rules engine for overtime threshold and auto-flagging
13. **Audit trail** — Change history log for all HR record modifications

### Phase 4 — Advanced Features (P3) — Weeks 11+
> Enterprise-grade features for scaling companies

14. Recruitment module
15. Performance review system
16. Training & LMS
17. Benefits administration
18. Organization chart

---

## 6. Reference: Open-Source HR Projects Compared

| Feature | OrangeHRM | Odoo HR | ERPNext HR | Sentrifugo | **Cardlink** |
|---------|-----------|---------|------------|------------|--------------|
| Employee Database | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave Management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave Balances | ✅ | ✅ | ✅ | ✅ | ❌ |
| Attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shift Scheduling | ✅ | ✅ | ✅ | ❌ | ❌ |
| Payroll | ✅ (add-on) | ✅ | ✅ | ❌ | ✅ |
| Tax Calculation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Payslips | ✅ | ✅ | ✅ | ❌ | ❌ |
| Recruitment / ATS | ✅ | ✅ | ✅ | ✅ | ❌ |
| Onboarding | ✅ | ✅ | ✅ | ✅ | ❌ |
| Performance Reviews | ✅ | ✅ | ✅ | ✅ | ❌ |
| Training / LMS | ✅ | ✅ | ✅ | ❌ | ❌ |
| Employee Self-Service | ✅ | ✅ | ✅ | ✅ | ❌ |
| HR Reports | ✅ | ✅ | ✅ | ✅ | ❌ |
| Document Management | ✅ | ✅ | ✅ | ✅ | ❌ |
| Org Chart | ✅ | ✅ | ✅ | ❌ | ❌ |
| Benefits | ❌ | ✅ | ✅ | ❌ | ❌ |
| Expense Management | ❌ | ✅ | ✅ | ❌ | ❌ |
| Surveys / Engagement | ❌ | ✅ | ❌ | ❌ | ❌ |
| Multi-language | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 7. Conclusion

The Cardlink HR module provides a **solid foundation** with the 4 core pillars (Employees, Leave, Attendance, Payroll) well-implemented. However, at **23% feature coverage** compared to a comprehensive HR system, it currently serves as a **basic HR tracker** rather than a **professional HR management system**.

**To be considered comprehensive for SME use**, the app needs at minimum the **8 critical (P0/P1) features** listed above — particularly leave balance management, employee self-service, tax calculation, payslip generation, and HR reporting. These would bring coverage to approximately **45-50%**, which is the minimum acceptable threshold for a production SME HR system.

The good news is that Cardlink's existing architecture (Supabase + Next.js + RLS policies + i18n) is well-suited for adding these features incrementally, and the 4 existing modules provide a strong base to build upon.
