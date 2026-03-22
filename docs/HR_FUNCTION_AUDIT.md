# HR & Accounting Function Audit — Gap Analysis for SMC

> **Purpose:** Comprehensive audit of Cardlink's HR and Accounting modules against professional open-source HR systems (OrangeHRM, ERPNext HRMS, Odoo HR) and regional statutory requirements for Small-Medium Companies (SMC) operating in Malaysia, Singapore, and Hong Kong.
>
> **Date:** 2026-03-22
>
> **References:**
> - [OrangeHRM](https://github.com/orangehrm/orangehrm) — Open-source HRMS
> - [ERPNext HRMS](https://github.com/frappe/hrms) — Frappe HR module
> - [Odoo HR](https://github.com/odoo/odoo) — Odoo Human Resources

---

## Table of Contents

1. [Professional HR Function List](#1-professional-hr-function-list)
2. [Professional HR Workflow List](#2-professional-hr-workflow-list)
3. [Cardlink HR Feature Mapping](#3-cardlink-hr-feature-mapping)
4. [Missing HR Functions](#4-missing-hr-functions)
5. [Accounting Comprehensiveness for SMC](#5-accounting-comprehensiveness-for-smc)
6. [Missing Accounting Functions for SMC](#6-missing-accounting-functions-for-smc)
7. [Priority Recommendations](#7-priority-recommendations)
8. [Summary Verdict](#8-summary-verdict)

---

## 1. Professional HR Function List

Below is the consolidated function list derived from OrangeHRM, ERPNext HRMS, and Odoo HR — the three leading open-source HR platforms.

### 1.1 Employee Information Management (PIM)

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.1.1 | Employee Master Record | ✓ | ✓ | ✓ | Centralized employee database (personal details, contact, emergency contact, job info) |
| 1.1.2 | Employment History | ✓ | ✓ | ✓ | Previous employers, roles, dates |
| 1.1.3 | Education & Qualifications | ✓ | ✓ | ✓ | Degrees, certifications, licenses |
| 1.1.4 | Skills & Competencies | ✓ | ✓ | ✓ | Skill tracking, proficiency levels |
| 1.1.5 | Emergency Contacts | ✓ | ✓ | ✓ | Multiple emergency contact records |
| 1.1.6 | Dependents | ✓ | ✓ | ✓ | Family members, dependents for benefits |
| 1.1.7 | Employee Documents | ✓ | ✓ | ✓ | ID copies, contracts, certificates stored per employee |
| 1.1.8 | Custom Fields | ✓ | ✓ | ✓ | User-defined fields for additional data |
| 1.1.9 | Profile Photo / Avatar | ✓ | ✓ | ✓ | Employee picture |
| 1.1.10 | Employee Status Lifecycle | ✓ | ✓ | ✓ | Active → Probation → Confirmed → On Notice → Terminated |

### 1.2 Organizational Structure

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.2.1 | Department Management | ✓ | ✓ | ✓ | Create/manage departments with hierarchy |
| 1.2.2 | Designation / Job Title Management | ✓ | ✓ | ✓ | Define job titles and grades |
| 1.2.3 | Reporting Structure | ✓ | ✓ | ✓ | Manager/supervisor relationships |
| 1.2.4 | Organization Chart | ✓ | ✓ | ✓ | Visual hierarchy tree |
| 1.2.5 | Branch / Location Management | ✓ | ✓ | ✓ | Multi-office/branch support |
| 1.2.6 | Cost Center Assignment | — | ✓ | ✓ | Link employees to accounting cost centers |
| 1.2.7 | Employee Grade / Pay Grade | ✓ | ✓ | ✓ | Salary bands and job grades |

### 1.3 Recruitment & Applicant Tracking (ATS)

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.3.1 | Job Requisition | ✓ | ✓ | ✓ | Internal request to hire (with approval) |
| 1.3.2 | Job Posting | ✓ | ✓ | ✓ | Publish vacancies (internal/external) |
| 1.3.3 | Applicant Tracking Pipeline | ✓ | ✓ | ✓ | Kanban/stage-based candidate tracking |
| 1.3.4 | Resume / CV Management | ✓ | ✓ | ✓ | Upload, parse, search candidate resumes |
| 1.3.5 | Interview Scheduling | ✓ | ✓ | ✓ | Schedule and track interviews |
| 1.3.6 | Interview Feedback | ✓ | ✓ | ✓ | Evaluator notes and scoring |
| 1.3.7 | Offer Letter Generation | — | ✓ | ✓ | Template-based offer letters |
| 1.3.8 | Candidate-to-Employee Conversion | ✓ | ✓ | ✓ | Auto-create employee from hired candidate |

### 1.4 Onboarding & Offboarding

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.4.1 | Onboarding Checklist | ✓ | ✓ | ✓ | Task list for new hires (IT setup, documents, training) |
| 1.4.2 | Onboarding Workflow | ✓ | ✓ | ✓ | Multi-step process with assignments |
| 1.4.3 | Welcome Package / Document Collection | ✓ | ✓ | ✓ | Collect signed documents, tax forms, bank details |
| 1.4.4 | Offboarding Checklist | ✓ | ✓ | ✓ | Exit tasks (return equipment, access revocation) |
| 1.4.5 | Exit Interview | ✓ | ✓ | ✓ | Record exit feedback |
| 1.4.6 | Final Settlement Calculation | — | ✓ | ✓ | Calculate remaining salary, leave encashment, deductions |

### 1.5 Leave / Time-Off Management

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.5.1 | Leave Type Configuration | ✓ | ✓ | ✓ | Define leave types (annual, sick, maternity, etc.) |
| 1.5.2 | Leave Request & Approval | ✓ | ✓ | ✓ | Submit request → Manager approves/rejects |
| 1.5.3 | Leave Balance Tracking | ✓ | ✓ | ✓ | Real-time balance per employee per type |
| 1.5.4 | Leave Entitlement / Allocation | ✓ | ✓ | ✓ | Annual allocation rules (by tenure, grade) |
| 1.5.5 | Leave Accrual | ✓ | ✓ | ✓ | Monthly/quarterly accrual of leave days |
| 1.5.6 | Leave Carry-Forward | ✓ | ✓ | ✓ | Year-end carry-over rules |
| 1.5.7 | Leave Encashment | — | ✓ | ✓ | Convert unused leave to cash |
| 1.5.8 | Holiday Calendar | ✓ | ✓ | ✓ | Public holidays per region/branch |
| 1.5.9 | Compensatory Leave | — | ✓ | ✓ | Leave granted for working on holidays |
| 1.5.10 | Leave Ledger / History | ✓ | ✓ | ✓ | Full audit trail of leave transactions |
| 1.5.11 | Team Leave Calendar | ✓ | ✓ | ✓ | Visual view of who is on leave |

### 1.6 Attendance & Time Tracking

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.6.1 | Clock-In / Clock-Out | ✓ | ✓ | ✓ | Daily time recording |
| 1.6.2 | Attendance Status | ✓ | ✓ | ✓ | Present, absent, late, half-day |
| 1.6.3 | Overtime Tracking | ✓ | ✓ | ✓ | Track and compute overtime hours |
| 1.6.4 | Timesheet / Project Hours | ✓ | ✓ | ✓ | Log hours against projects/tasks |
| 1.6.5 | Shift Management | ✓ | ✓ | ✓ | Define shifts (morning, night, rotating) |
| 1.6.6 | Shift Assignment / Roster | ✓ | ✓ | ✓ | Assign employees to shifts |
| 1.6.7 | Biometric / Hardware Integration | ✓ | ✓ | ✓ | Connect fingerprint/card readers |
| 1.6.8 | GPS / Mobile Check-In | — | ✓ | ✓ | Location-based attendance via mobile |
| 1.6.9 | Work-From-Home Tracking | — | ✓ | — | WFH attendance logging |
| 1.6.10 | Attendance Regularization | ✓ | ✓ | ✓ | Correct missed punch with approval |

### 1.7 Payroll & Compensation

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.7.1 | Salary Structure / Template | — | ✓ | ✓ | Define earning and deduction components |
| 1.7.2 | Salary Component Configuration | — | ✓ | ✓ | Basic, HRA, transport, meal, etc. |
| 1.7.3 | Payroll Processing (Bulk) | — | ✓ | ✓ | Batch payslip generation for all employees |
| 1.7.4 | Payslip Generation | — | ✓ | ✓ | Individual payslip with breakdown |
| 1.7.5 | Overtime Calculation in Payroll | — | ✓ | ✓ | Auto-add overtime from attendance |
| 1.7.6 | Tax Calculation (PCB/CPF/MPF) | — | ✓ | ✓ | Regional statutory tax deductions |
| 1.7.7 | Statutory Contributions (EPF/SOCSO/EIS/CPF/MPF) | — | ✓ | ✓ | Auto-calculate employer & employee portions |
| 1.7.8 | Payroll Accounting Integration | — | ✓ | ✓ | Auto-post payroll journal entries |
| 1.7.9 | Bank Payment File Generation | — | ✓ | ✓ | Generate bank upload files for salary disbursement |
| 1.7.10 | Payroll Reports | — | ✓ | ✓ | Summary, department-wise, statutory reports |
| 1.7.11 | Leave Deduction in Payroll | — | ✓ | ✓ | Auto-deduct for unpaid leave |
| 1.7.12 | Multi-Currency Payroll | — | ✓ | ✓ | Pay different currencies for different employees |
| 1.7.13 | Year-End Tax Forms (EA/IR8A) | — | ✓ | — | Generate annual tax return forms |
| 1.7.14 | Salary Revision History | — | ✓ | ✓ | Track salary changes over time |

### 1.8 Performance Management

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.8.1 | Goal Setting (KPI) | ✓ | ✓ | ✓ | Define individual/team/company goals |
| 1.8.2 | Appraisal Cycles | ✓ | ✓ | ✓ | Schedule periodic performance reviews |
| 1.8.3 | Self-Assessment | ✓ | ✓ | ✓ | Employee self-evaluation form |
| 1.8.4 | Manager Assessment | ✓ | ✓ | ✓ | Supervisor evaluation |
| 1.8.5 | 360° Feedback | ✓ | ✓ | ✓ | Collect reviews from peers, subordinates |
| 1.8.6 | Performance Score / Rating | ✓ | ✓ | ✓ | Weighted scoring system |
| 1.8.7 | PIP (Performance Improvement Plan) | ✓ | ✓ | — | Structured improvement plan for underperformers |

### 1.9 Training & Development

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.9.1 | Training Program Management | ✓ | ✓ | ✓ | Create/schedule training programs |
| 1.9.2 | Training Request & Approval | ✓ | ✓ | ✓ | Employee requests training → approval |
| 1.9.3 | Training Attendance Tracking | ✓ | ✓ | ✓ | Track who attended which training |
| 1.9.4 | Certification Tracking | ✓ | ✓ | ✓ | Expiry alerts for certifications |
| 1.9.5 | Training Cost Tracking | ✓ | ✓ | ✓ | Budget and actual cost per training |
| 1.9.6 | Skill Gap Analysis | — | ✓ | ✓ | Compare required vs. actual skills |

### 1.10 Expense Claims & Reimbursement

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.10.1 | Expense Claim Submission | ✓ | ✓ | ✓ | Submit expenses with receipt uploads |
| 1.10.2 | Expense Approval Workflow | ✓ | ✓ | ✓ | Multi-level approval chain |
| 1.10.3 | Expense Category Management | ✓ | ✓ | ✓ | Travel, meals, accommodation, etc. |
| 1.10.4 | Expense-to-Accounting Integration | — | ✓ | ✓ | Auto-post to GL accounts |
| 1.10.5 | Travel Request & Advance | — | ✓ | ✓ | Pre-trip request and cash advance |

### 1.11 Benefits Administration

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.11.1 | Benefits Plan Configuration | ✓ | ✓ | ✓ | Health insurance, dental, vision plans |
| 1.11.2 | Employee Benefits Enrollment | ✓ | ✓ | ✓ | Self-serve enrollment during open period |
| 1.11.3 | Benefits Deduction in Payroll | — | ✓ | ✓ | Auto-deduct premiums from salary |

### 1.12 Document Management

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.12.1 | Employee Document Storage | ✓ | ✓ | ✓ | Per-employee document repository |
| 1.12.2 | Document Expiry Alerts | — | ✓ | ✓ | Notify when work permits, licenses expire |
| 1.12.3 | Digital Signature / E-Sign | — | — | ✓ | Sign contracts and documents digitally |
| 1.12.4 | Company Policy Documents | ✓ | ✓ | ✓ | Employee handbook, policy distribution |

### 1.13 Employee Self-Service (ESS)

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.13.1 | View / Update Personal Info | ✓ | ✓ | ✓ | Employees manage own profile |
| 1.13.2 | Apply for Leave | ✓ | ✓ | ✓ | Self-service leave request |
| 1.13.3 | View Payslip | ✓ | ✓ | ✓ | Download/view pay stubs |
| 1.13.4 | Submit Expense Claim | ✓ | ✓ | ✓ | Self-serve expense submission |
| 1.13.5 | View Attendance Record | ✓ | ✓ | ✓ | Check own attendance history |
| 1.13.6 | View Leave Balance | ✓ | ✓ | ✓ | Check remaining leave entitlements |

### 1.14 Compliance & Statutory

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.14.1 | Employment Contract Management | ✓ | ✓ | ✓ | Store and track employment contracts |
| 1.14.2 | Statutory Contribution Calculation | — | ✓ | ✓ | Auto EPF/SOCSO/EIS (MY), CPF (SG), MPF (HK) |
| 1.14.3 | Tax Form Generation | — | ✓ | — | EA Form (MY), IR8A (SG), BIR56A (HK) |
| 1.14.4 | Labour Law Compliance Alerts | — | ✓ | ✓ | Working hours, overtime limits, leave minimums |
| 1.14.5 | Data Privacy / PDPA Compliance | ✓ | ✓ | ✓ | Consent management, data retention, encryption |
| 1.14.6 | Audit Trail | ✓ | ✓ | ✓ | Full change log for HR records |

### 1.15 Reporting & Analytics

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.15.1 | Headcount Report | ✓ | ✓ | ✓ | Total employees by department, type, status |
| 1.15.2 | Turnover / Attrition Report | ✓ | ✓ | ✓ | Resignation rates, trends |
| 1.15.3 | Leave Usage Report | ✓ | ✓ | ✓ | Leave taken vs. balance by type |
| 1.15.4 | Attendance Summary Report | ✓ | ✓ | ✓ | Present/absent/late statistics |
| 1.15.5 | Payroll Summary Report | — | ✓ | ✓ | Total payroll cost, department-wise |
| 1.15.6 | Statutory Contribution Report | — | ✓ | ✓ | EPF/SOCSO/CPF/MPF summaries |
| 1.15.7 | Training Report | ✓ | ✓ | ✓ | Training hours, completion rates |
| 1.15.8 | Custom Report Builder | ✓ | ✓ | ✓ | Ad-hoc report creation |

### 1.16 Grievance & Disciplinary

| # | Function | OrangeHRM | ERPNext | Odoo | Description |
|---|----------|-----------|---------|------|-------------|
| 1.16.1 | Grievance Submission | ✓ | — | — | Confidential complaint filing |
| 1.16.2 | Grievance Case Tracking | ✓ | — | — | Investigation and resolution |
| 1.16.3 | Disciplinary Action Record | ✓ | ✓ | — | Warning letters, suspensions |

---

## 2. Professional HR Workflow List

### 2.1 Core Workflows

| # | Workflow | Steps | Status |
|---|----------|-------|--------|
| W1 | **Hire-to-Retire** | Requisition → Post Job → Screen → Interview → Offer → Onboard → Active → Retire/Terminate | End-to-end lifecycle |
| W2 | **Leave Request** | Employee submits → Manager reviews → Approve/Reject → Balance updated → Calendar updated | Approval flow |
| W3 | **Attendance** | Clock-in → Work → Clock-out → Hours calculated → Attendance marked | Daily tracking |
| W4 | **Payroll Cycle** | Configure salary → Pull attendance/leave → Calculate components → Tax deductions → Approve → Disburse → Post to accounting | Monthly cycle |
| W5 | **Performance Review** | Set goals → Mid-year check → Self-assess → Manager review → 360° feedback → Rating → Increment decision | Annual/bi-annual |
| W6 | **Expense Claim** | Employee submits → Manager approves → Finance reviews → Reimburse → Post to GL | Approval + accounting |
| W7 | **Training** | Identify need → Request → Approve → Schedule → Attend → Evaluate → Certificate | Development cycle |
| W8 | **Onboarding** | Accept offer → Document collection → IT setup → Orientation → Assign buddy → Complete checklist | New hire |
| W9 | **Offboarding** | Resign/terminate → Notice period → Exit interview → Handover → Return assets → Final settlement → Deactivate | Exit |
| W10 | **Salary Revision** | Performance score → Manager recommends → HR reviews → Budget check → Approve → Effective date | Annual/promotion |
| W11 | **Recruitment Pipeline** | Job opening → Source candidates → Screen → Shortlist → Interview → Offer → Accept/Decline | Hiring |
| W12 | **Grievance Resolution** | File complaint → Assign investigator → Investigation → Resolution → Follow-up → Close | Case management |

---

## 3. Cardlink HR Feature Mapping

### Legend
- ✅ **Implemented** — Feature exists and is functional
- ⚠️ **Partial** — Basic version exists but lacks depth
- ❌ **Missing** — Not implemented

### 3.1 Employee Information Management (PIM)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.1.1 | Employee Master Record | ✅ Implemented | `hr_employees` table: full_name, email, phone, position, department, employment_type, salary, status |
| 1.1.2 | Employment History | ❌ Missing | No previous employment tracking |
| 1.1.3 | Education & Qualifications | ❌ Missing | No education/certification fields |
| 1.1.4 | Skills & Competencies | ❌ Missing | No skill tracking |
| 1.1.5 | Emergency Contacts | ❌ Missing | No emergency contact fields |
| 1.1.6 | Dependents | ❌ Missing | No dependent records |
| 1.1.7 | Employee Documents | ❌ Missing | No per-employee document storage (accounting module has generic documents) |
| 1.1.8 | Custom Fields | ❌ Missing | No custom field support |
| 1.1.9 | Profile Photo / Avatar | ✅ Implemented | `avatar_url` field exists |
| 1.1.10 | Employee Status Lifecycle | ⚠️ Partial | Only 3 states: active, inactive, terminated (missing probation, confirmed, on-notice) |

### 3.2 Organizational Structure

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.2.1 | Department Management | ⚠️ Partial | Free-text `department` field on employee; no department table |
| 1.2.2 | Designation / Job Title | ⚠️ Partial | Free-text `position` field; no designation master |
| 1.2.3 | Reporting Structure | ❌ Missing | No manager/supervisor relationship |
| 1.2.4 | Organization Chart | ❌ Missing | No org chart visualization |
| 1.2.5 | Branch / Location | ❌ Missing | No multi-branch employee assignment |
| 1.2.6 | Cost Center Assignment | ❌ Missing | No GL/cost center linkage |
| 1.2.7 | Employee Grade / Pay Grade | ❌ Missing | No grade/band system |

### 3.3 Recruitment & ATS

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.3.1 | Job Requisition | ❌ Missing | No recruitment module |
| 1.3.2 | Job Posting | ❌ Missing | — |
| 1.3.3 | Applicant Tracking Pipeline | ❌ Missing | — |
| 1.3.4 | Resume / CV Management | ❌ Missing | — |
| 1.3.5 | Interview Scheduling | ❌ Missing | — |
| 1.3.6 | Interview Feedback | ❌ Missing | — |
| 1.3.7 | Offer Letter Generation | ❌ Missing | — |
| 1.3.8 | Candidate-to-Employee Conversion | ❌ Missing | — |

### 3.4 Onboarding & Offboarding

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.4.1 | Onboarding Checklist | ❌ Missing | — |
| 1.4.2 | Onboarding Workflow | ❌ Missing | — |
| 1.4.3 | Document Collection | ❌ Missing | — |
| 1.4.4 | Offboarding Checklist | ❌ Missing | — |
| 1.4.5 | Exit Interview | ❌ Missing | — |
| 1.4.6 | Final Settlement | ❌ Missing | — |

### 3.5 Leave Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.5.1 | Leave Type Configuration | ⚠️ Partial | 5 types hardcoded (annual, sick, unpaid, maternity, other); not configurable |
| 1.5.2 | Leave Request & Approval | ✅ Implemented | Submit → pending → approved/rejected; notifications to admins |
| 1.5.3 | Leave Balance Tracking | ❌ Missing | No balance tracking; unlimited requests |
| 1.5.4 | Leave Entitlement / Allocation | ❌ Missing | No annual allocation rules |
| 1.5.5 | Leave Accrual | ❌ Missing | No accrual engine |
| 1.5.6 | Leave Carry-Forward | ❌ Missing | No year-end rules |
| 1.5.7 | Leave Encashment | ❌ Missing | — |
| 1.5.8 | Holiday Calendar | ❌ Missing | No public holiday management |
| 1.5.9 | Compensatory Leave | ❌ Missing | — |
| 1.5.10 | Leave Ledger / History | ⚠️ Partial | Can view past requests but no formal ledger |
| 1.5.11 | Team Leave Calendar | ❌ Missing | — |

### 3.6 Attendance & Time Tracking

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.6.1 | Clock-In / Clock-Out | ✅ Implemented | Per-day with hours calculated |
| 1.6.2 | Attendance Status | ✅ Implemented | present, absent, late, half_day |
| 1.6.3 | Overtime Tracking | ❌ Missing | No overtime hours calculation |
| 1.6.4 | Timesheet / Project Hours | ❌ Missing | No project-based time logging |
| 1.6.5 | Shift Management | ❌ Missing | No shift definitions |
| 1.6.6 | Shift Assignment / Roster | ❌ Missing | — |
| 1.6.7 | Biometric / Hardware Integration | ❌ Missing | No device integration |
| 1.6.8 | GPS / Mobile Check-In | ❌ Missing | — |
| 1.6.9 | Work-From-Home Tracking | ❌ Missing | — |
| 1.6.10 | Attendance Regularization | ❌ Missing | No missed-punch correction workflow |

### 3.7 Payroll & Compensation

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.7.1 | Salary Structure / Template | ❌ Missing | Only flat basic_salary; no component structure |
| 1.7.2 | Salary Component Configuration | ❌ Missing | No earning/deduction components |
| 1.7.3 | Payroll Processing (Bulk) | ✅ Implemented | `action=generate` creates payroll for all active employees |
| 1.7.4 | Payslip Generation | ❌ Missing | No downloadable payslip |
| 1.7.5 | Overtime Calculation in Payroll | ❌ Missing | `overtime` field exists but manual entry only |
| 1.7.6 | Tax Calculation (PCB/CPF/MPF) | ❌ Missing | No statutory tax computation |
| 1.7.7 | Statutory Contributions | ❌ Missing | No EPF/SOCSO/EIS/CPF/MPF |
| 1.7.8 | Payroll-Accounting Integration | ❌ Missing | HR payroll not linked to accounting journal entries |
| 1.7.9 | Bank Payment File | ❌ Missing | No bank file generation |
| 1.7.10 | Payroll Reports | ❌ Missing | No payroll summary reports |
| 1.7.11 | Leave Deduction in Payroll | ❌ Missing | No leave-to-payroll integration |
| 1.7.12 | Multi-Currency Payroll | ❌ Missing | No currency field in hr_payroll |
| 1.7.13 | Year-End Tax Forms | ❌ Missing | — |
| 1.7.14 | Salary Revision History | ❌ Missing | No salary change tracking |

### 3.8 Performance Management

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.8.1–1.8.7 | All Performance Functions | ❌ Missing | No performance module |

### 3.9 Training & Development

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.9.1–1.9.6 | All Training Functions | ❌ Missing | No training module |

### 3.10 Expense Claims

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.10.1–1.10.5 | All Expense Functions | ❌ Missing | No expense claim module |

### 3.11 Benefits Administration

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.11.1–1.11.3 | All Benefits Functions | ❌ Missing | No benefits module |

### 3.12 Document Management (HR-specific)

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.12.1 | Employee Document Storage | ❌ Missing | Accounting has generic documents; no HR-specific per-employee docs |
| 1.12.2 | Document Expiry Alerts | ❌ Missing | — |
| 1.12.3 | Digital Signature | ❌ Missing | — |
| 1.12.4 | Company Policy Documents | ❌ Missing | — |

### 3.13 Employee Self-Service

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.13.1 | View / Update Personal Info | ❌ Missing | No employee portal (admin-only views) |
| 1.13.2 | Apply for Leave | ❌ Missing | Leave is admin-side only |
| 1.13.3 | View Payslip | ❌ Missing | — |
| 1.13.4 | Submit Expense Claim | ❌ Missing | — |
| 1.13.5 | View Attendance Record | ❌ Missing | — |
| 1.13.6 | View Leave Balance | ❌ Missing | — |

### 3.14 Compliance & Statutory

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.14.1 | Employment Contract Management | ❌ Missing | No contract storage/tracking |
| 1.14.2 | Statutory Contribution Calculation | ❌ Missing | — |
| 1.14.3 | Tax Form Generation | ❌ Missing | — |
| 1.14.4 | Labour Law Compliance Alerts | ❌ Missing | — |
| 1.14.5 | Data Privacy / PDPA Compliance | ⚠️ Partial | RLS enforced; no explicit consent management |
| 1.14.6 | Audit Trail | ⚠️ Partial | Accounting has audit_log but HR module lacks dedicated audit |

### 3.15 Reporting & Analytics

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.15.1 | Headcount Report | ❌ Missing | Dashboard shows count but no export/detailed report |
| 1.15.2 | Turnover Report | ❌ Missing | — |
| 1.15.3 | Leave Usage Report | ❌ Missing | — |
| 1.15.4 | Attendance Summary Report | ❌ Missing | — |
| 1.15.5 | Payroll Summary Report | ❌ Missing | — |
| 1.15.6 | Statutory Contribution Report | ❌ Missing | — |
| 1.15.7 | Training Report | ❌ Missing | — |
| 1.15.8 | Custom Report Builder | ❌ Missing | — |

### 3.16 Grievance & Disciplinary

| # | Function | Cardlink Status | Notes |
|---|----------|----------------|-------|
| 1.16.1–1.16.3 | All Grievance Functions | ❌ Missing | No grievance module |

### 3.17 Workflow Mapping

| # | Workflow | Cardlink Status | Notes |
|---|----------|----------------|-------|
| W1 | Hire-to-Retire | ❌ Missing | No recruitment or onboarding; basic employee CRUD only |
| W2 | Leave Request | ✅ Implemented | Submit → Approve/Reject with notifications |
| W3 | Attendance | ✅ Implemented | Clock-in/out with hours calculation |
| W4 | Payroll Cycle | ⚠️ Partial | Bulk generate → approve → paid; missing tax/statutory/accounting link |
| W5 | Performance Review | ❌ Missing | — |
| W6 | Expense Claim | ❌ Missing | — |
| W7 | Training | ❌ Missing | — |
| W8 | Onboarding | ❌ Missing | — |
| W9 | Offboarding | ❌ Missing | — |
| W10 | Salary Revision | ❌ Missing | — |
| W11 | Recruitment Pipeline | ❌ Missing | — |
| W12 | Grievance Resolution | ❌ Missing | — |

---

## 4. Missing HR Functions — Summary

### 4.1 Score

| Category | Total Functions | ✅ Implemented | ⚠️ Partial | ❌ Missing |
|----------|----------------|---------------|------------|-----------|
| Employee Info (PIM) | 10 | 2 | 1 | 7 |
| Organizational Structure | 7 | 0 | 2 | 5 |
| Recruitment & ATS | 8 | 0 | 0 | 8 |
| Onboarding / Offboarding | 6 | 0 | 0 | 6 |
| Leave Management | 11 | 1 | 2 | 8 |
| Attendance & Time | 10 | 2 | 0 | 8 |
| Payroll & Compensation | 14 | 1 | 0 | 13 |
| Performance Management | 7 | 0 | 0 | 7 |
| Training & Development | 6 | 0 | 0 | 6 |
| Expense Claims | 5 | 0 | 0 | 5 |
| Benefits Administration | 3 | 0 | 0 | 3 |
| Document Management | 4 | 0 | 0 | 4 |
| Employee Self-Service | 6 | 0 | 0 | 6 |
| Compliance & Statutory | 6 | 0 | 2 | 4 |
| Reporting & Analytics | 8 | 0 | 0 | 8 |
| Grievance & Disciplinary | 3 | 0 | 0 | 3 |
| **TOTAL** | **114** | **6 (5%)** | **7 (6%)** | **101 (89%)** |

### 4.2 Critical Missing Functions for SMC

These are **must-have** for any SMC operating in Malaysia/Singapore/Hong Kong:

| Priority | Missing Function | Business Impact |
|----------|-----------------|-----------------|
| 🔴 P0 | Statutory Contributions (EPF/SOCSO/CPF/MPF) | Legal compliance; fines for non-compliance |
| 🔴 P0 | Tax Calculation (PCB/Income Tax) | Legal compliance; penalties for incorrect deductions |
| 🔴 P0 | Leave Balance & Entitlement | Labour law requires tracking; dispute risk |
| 🔴 P0 | Employment Contract Management | Legal requirement in all 3 jurisdictions |
| 🟠 P1 | Payslip Generation | Employee right to itemized payslip (mandatory in SG) |
| 🟠 P1 | Salary Structure & Components | Proper salary breakdown needed for tax reporting |
| 🟠 P1 | Payroll-Accounting Integration | Manual re-entry is error-prone and audit risk |
| 🟠 P1 | Holiday Calendar | Needed for correct leave & overtime calculation |
| 🟠 P1 | Overtime Tracking & Calculation | Mandatory under Employment Act (MY/SG) |
| 🟠 P1 | Year-End Tax Forms (EA/IR8A) | Annual compliance requirement |
| 🟡 P2 | Reporting & Analytics (HR) | Needed for management decisions and audits |
| 🟡 P2 | Employee Self-Service | Reduces HR admin burden significantly |
| 🟡 P2 | Department & Designation Master | Data integrity; prevents free-text inconsistencies |
| 🟡 P2 | Onboarding Checklist | Standardizes new hire process |
| 🟢 P3 | Recruitment & ATS | Nice-to-have for SMC (can use external tools) |
| 🟢 P3 | Performance Management | Important but not legally required |
| 🟢 P3 | Training & Development | Important for growth but not critical initially |
| 🟢 P3 | Grievance Management | Good practice; may use manual process initially |

---

## 5. Accounting Comprehensiveness for SMC

### 5.1 Accounting Feature Assessment

| # | Function | Cardlink Status | SMC Requirement | Notes |
|---|----------|----------------|-----------------|-------|
| A1 | Chart of Accounts | ✅ Implemented | Required | 5 account types, hierarchical, active/inactive |
| A2 | Double-Entry Journal Entries | ✅ Implemented | Required | Validated debit=credit, idempotent |
| A3 | Invoice Management | ✅ Implemented | Required | Draft→Sent→Paid→Overdue lifecycle |
| A4 | Multi-Currency | ✅ Implemented | Required (APAC) | Per-line exchange rates in transactions |
| A5 | Tax Rate Configuration | ✅ Implemented | Required | Multiple rates, regional, default rate |
| A6 | Contact Management | ✅ Implemented | Required | Customer/Vendor/Employee types |
| A7 | Trial Balance | ✅ Implemented | Required | Date-range filtered |
| A8 | Profit & Loss Statement | ✅ Implemented | Required | Revenue - Expenses = Net Income |
| A9 | Balance Sheet | ✅ Implemented | Required | Assets = Liabilities + Equity check |
| A10 | Cash Flow Statement | ⚠️ Partial | Required | Estimated from asset accounts only; not proper indirect/direct method |
| A11 | Document Management (OCR) | ✅ Implemented | Good to have | Receipt uploads with optional OCR |
| A12 | Audit Trail | ✅ Implemented | Required | Full action/user/old/new value logging |
| A13 | Payroll Records | ✅ Implemented | Required | Encrypted bank details, gross/deductions/net |
| A14 | Inventory Tracking | ✅ Implemented | Good to have | SKU-based with GL linkage |
| A15 | Bank Reconciliation | ❌ Placeholder | Required | API stub only; no actual bank feed |
| A16 | Accounts Receivable Aging | ❌ Missing | Required | No aging report for overdue invoices |
| A17 | Accounts Payable | ❌ Missing | Required | No purchase invoice / vendor bill management |
| A18 | Budget Management | ❌ Missing | Good to have | No budget vs. actual tracking |
| A19 | Fixed Asset Management | ❌ Missing | Required | No asset register or depreciation |
| A20 | Recurring Transactions | ❌ Missing | Good to have | No auto-recurring journal entries |
| A21 | Credit Notes / Refunds | ❌ Missing | Required | No credit note for returns/adjustments |
| A22 | Purchase Invoice / Bills | ❌ Missing | Required | No vendor bill entry (procurement is separate) |
| A23 | Payment Recording | ⚠️ Partial | Required | Invoice status change but no payment journal auto-posting |
| A24 | GST/SST Return Report | ❌ Missing | Required (MY/SG) | No tax return preparation |
| A25 | Financial Year Management | ❌ Missing | Required | No fiscal year open/close |
| A26 | Report Export (PDF/Excel) | ⚠️ Partial | Required | Reports return JSON; exportable_formats listed but not implemented |
| A27 | Multi-Company Consolidation | ❌ Missing | Good to have | Single org per company |
| A28 | Bank Payment Integration | ❌ Missing | Good to have | No payment gateway for vendor payments |

### 5.2 Accounting Score

| Category | Total | ✅ | ⚠️ | ❌ |
|----------|-------|---|---|---|
| Core Accounting | 14 | 11 | 1 | 2 |
| Reporting | 6 | 3 | 1 | 2 |
| Compliance | 4 | 1 | 0 | 3 |
| Advanced | 4 | 0 | 1 | 3 |
| **TOTAL** | **28** | **15 (54%)** | **3 (11%)** | **10 (36%)** |

---

## 6. Missing Accounting Functions for SMC

| Priority | Missing Function | Business Impact |
|----------|-----------------|-----------------|
| 🔴 P0 | Bank Reconciliation | Required for accurate cash position; audit requirement |
| 🔴 P0 | Accounts Payable (Vendor Bills) | Cannot track money owed to suppliers |
| 🔴 P0 | Accounts Receivable Aging Report | Cannot manage collections effectively |
| 🔴 P0 | GST/SST Tax Return Report | Legal compliance (Malaysia SST, Singapore GST) |
| 🟠 P1 | Credit Notes / Refunds | Needed for returns, corrections |
| 🟠 P1 | Fixed Asset Register & Depreciation | Required for tax reporting |
| 🟠 P1 | Financial Year Management | Year-end close/open process |
| 🟠 P1 | Cash Flow Statement (proper method) | Current version is estimated only |
| 🟠 P1 | Report Export (PDF/Excel) | Auditors require downloadable reports |
| 🟡 P2 | Payment Recording (auto journal) | Reduce manual journal entry |
| 🟡 P2 | Recurring Transactions | Auto-rent, subscriptions, etc. |
| 🟡 P2 | Budget Management | Needed for financial planning |
| 🟢 P3 | Bank Payment Integration | Convenience; not legally required |
| 🟢 P3 | Multi-Company Consolidation | For group companies |

---

## 7. Priority Recommendations

### Phase 1 — Legal Compliance (P0, 4-6 weeks)

> **Goal:** Meet minimum legal requirements for MY/SG/HK operations.

- [ ] **Leave Balance & Entitlement System** — Track allocations, usage, balance per employee per leave type
- [ ] **Statutory Contribution Engine** — EPF/SOCSO/EIS (Malaysia), CPF (Singapore), MPF (Hong Kong) calculation tables
- [ ] **Tax Calculation Module** — PCB (Malaysia), income tax withholding (SG/HK)
- [ ] **Employment Contract Storage** — Per-employee contract upload and expiry tracking
- [ ] **Bank Reconciliation** — Manual matching of bank transactions to GL entries
- [ ] **Accounts Payable** — Vendor bill entry linked to procurement POs
- [ ] **AR Aging Report** — Invoice aging buckets (30/60/90 days)
- [ ] **GST/SST Tax Return Report** — Summarize tax collected and paid for filing

### Phase 2 — Operational Efficiency (P1, 4-6 weeks)

- [ ] **Salary Structure & Components** — Define earning/deduction templates
- [ ] **Payslip Generation** — Downloadable PDF payslips
- [ ] **Payroll-Accounting Integration** — Auto-post payroll as journal entries
- [ ] **Holiday Calendar** — Region-specific public holiday management
- [ ] **Overtime Tracking & Auto-Calculation** — Link attendance overtime to payroll
- [ ] **Credit Notes / Refunds** — Invoice adjustments
- [ ] **Fixed Asset Register** — Asset tracking with depreciation schedules
- [ ] **Financial Year Management** — Year-end close, period locking
- [ ] **Report Export (PDF/Excel)** — Downloadable financial reports
- [ ] **Year-End Tax Forms** — EA Form (MY), IR8A (SG) generation

### Phase 3 — Productivity (P2, 4-6 weeks)

- [ ] **Department & Designation Master Tables** — Normalize organizational data
- [ ] **Employee Self-Service Portal** — Employees view own data, apply for leave, view payslips
- [ ] **HR Reports & Analytics** — Headcount, turnover, leave usage, attendance summaries
- [ ] **Onboarding / Offboarding Checklists** — Task templates for new hires and exits
- [ ] **Budget Management** — Budget vs. actual per account/department
- [ ] **Recurring Transactions** — Auto-generate periodic journal entries

### Phase 4 — Enhancement (P3, 6-8 weeks)

- [ ] **Recruitment & ATS** — Job posting, applicant pipeline, interview scheduling
- [ ] **Performance Management** — Goal setting, appraisal cycles, 360° feedback
- [ ] **Training & Development** — Program management, attendance, certification tracking
- [ ] **Expense Claims** — Submission, approval, accounting integration
- [ ] **Grievance Management** — Confidential complaint filing and resolution
- [ ] **Employee Document Management** — Per-employee document repository with expiry alerts

---

## 8. Summary Verdict

### HR Module Assessment

> **Current State: Basic Framework (5% feature coverage)**
>
> Cardlink's HR module provides basic employee CRUD, leave approval, attendance tracking, and payroll generation. However, it **significantly lacks** the depth required for a professional HR system suitable for an SMC.

**Key Gaps:**
- ❌ No statutory compliance (EPF/SOCSO/CPF/MPF — legal requirement)
- ❌ No leave balance/entitlement tracking (labor law requirement)
- ❌ No salary structure or payslip generation
- ❌ No payroll-accounting integration
- ❌ No recruitment, onboarding, performance, or training modules
- ❌ No employee self-service
- ❌ No HR-specific reports

### Accounting Module Assessment

> **Current State: Solid Foundation (54% feature coverage)**
>
> Cardlink's accounting module has a **strong core**: double-entry bookkeeping, chart of accounts, multi-currency, invoicing, tax configuration, financial reports (P&L, Balance Sheet, Trial Balance), document management with OCR, audit trails, and encrypted payroll records.

**Key Gaps:**
- ❌ No bank reconciliation (critical for SMC)
- ❌ No accounts payable / vendor bills
- ❌ No AR aging report
- ❌ No GST/SST tax return reports (compliance)
- ❌ No fixed asset register
- ❌ No credit notes/refunds
- ⚠️ Cash flow report is estimation only

### Overall Verdict

| Module | Comprehensive for SMC? | Verdict |
|--------|----------------------|---------|
| **HR** | ❌ **No** | Needs significant development (Phases 1-3 minimum) to be SMC-ready |
| **Accounting** | ⚠️ **Partially** | Strong foundation; needs Phase 1 items (bank reconciliation, AP, AR aging, tax returns) to be SMC-ready |

> **Recommendation:** Prioritize **Phase 1 (Legal Compliance)** items for both HR and Accounting modules before marketing to SMC customers. The accounting foundation is strong and close to being comprehensive. The HR module requires substantial new development to meet professional standards.
