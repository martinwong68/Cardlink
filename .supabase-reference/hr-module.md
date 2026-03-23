# HR Module (Employees, Leave, Attendance, Payroll, Departments, Holidays, Documents, Reports)

> Updated: 2026-03-22
> 10 tables | Phase 1 & 2 rebuild complete

---

## Table of Contents

- [hr_employees](#hr_employees) — Extended with emergency contact, bank details, national ID
- [hr_leave_requests](#hr_leave_requests) — Added paternity leave type
- [hr_leave_balances](#hr_leave_balances) — NEW: Leave entitlements & quotas
- [hr_attendance](#hr_attendance) — Unchanged
- [hr_payroll](#hr_payroll) — Unchanged
- [hr_departments](#hr_departments) — NEW: Structured department management
- [hr_positions](#hr_positions) — NEW: Structured position management
- [hr_holidays](#hr_holidays) — NEW: Public holiday calendar
- [hr_documents](#hr_documents) — NEW: Employee document storage

---

## hr_employees

**Status:** ✅ Extended
**FK:** company_id → companies.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| full_name | text | | Required |
| email | text | | |
| phone | text | | |
| position | text | | Job title |
| department | text | | |
| employment_type | text | 'full_time' | full_time, part_time, contract |
| start_date | date | | |
| end_date | date | | |
| salary | numeric | 0 | |
| salary_period | text | 'monthly' | monthly, hourly |
| status | text | 'active' | active, inactive, terminated |
| avatar_url | text | | |
| address | text | | NEW: Home address |
| national_id | text | | NEW: IC / Tax number |
| bank_name | text | | NEW: Bank name |
| bank_account | text | | NEW: Bank account number |
| emergency_contact_name | text | | NEW: Emergency contact |
| emergency_contact_phone | text | | NEW |
| emergency_contact_relation | text | | NEW |
| reporting_manager_id | uuid | | NEW: FK → hr_employees.id |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- Company members via `company_members` join

### Referenced By

| Table | Column |
|-------|--------|
| hr_leave_requests | employee_id |
| hr_leave_balances | employee_id |
| hr_attendance | employee_id |
| hr_payroll | employee_id |
| hr_documents | employee_id |
| hr_employees | reporting_manager_id (self-ref) |

---

## hr_leave_requests

**Status:** ✅ Updated (added paternity type)
**FK:** employee_id → hr_employees.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| employee_id | uuid | | FK → hr_employees.id |
| leave_type | text | | annual, sick, unpaid, maternity, paternity, other |
| start_date | date | | |
| end_date | date | | |
| days | numeric | | Auto-calculated |
| reason | text | | |
| status | text | 'pending' | pending, approved, rejected |
| approved_by | uuid | | FK → auth.users |
| created_at | timestamptz | now() | |

---

## hr_leave_balances (NEW)

**Status:** ✅ New table
**FK:** employee_id → hr_employees.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| employee_id | uuid | | FK → hr_employees.id |
| leave_type | text | | annual, sick, unpaid, maternity, paternity, other |
| year | integer | | Calendar year |
| entitlement | numeric | 0 | Total days entitled |
| used | numeric | 0 | Days used (auto-deducted on approval) |
| carried_over | numeric | 0 | Days from previous year |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**UNIQUE:** (employee_id, leave_type, year)

---

## hr_attendance

**Status:** ✅ Unchanged

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| employee_id | uuid | | FK → hr_employees.id |
| date | date | | |
| clock_in | timestamptz | | |
| clock_out | timestamptz | | |
| hours_worked | numeric | | Auto-calculated |
| status | text | 'present' | present, absent, late, half_day |
| notes | text | | |
| created_at | timestamptz | now() | |

**UNIQUE:** (employee_id, date)

---

## hr_payroll

**Status:** ✅ Unchanged

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| employee_id | uuid | | FK → hr_employees.id |
| period_start | date | | |
| period_end | date | | |
| basic_salary | numeric | 0 | |
| overtime | numeric | 0 | |
| deductions | numeric | 0 | |
| allowances | numeric | 0 | |
| net_pay | numeric | 0 | |
| status | text | 'draft' | draft, approved, paid |
| paid_at | timestamptz | | |
| created_at | timestamptz | now() | |

---

## hr_departments (NEW)

**Status:** ✅ New table

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Required |
| description | text | | |
| created_at | timestamptz | now() | |

**UNIQUE:** (company_id, name)

---

## hr_positions (NEW)

**Status:** ✅ New table

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| title | text | | Required |
| department_id | uuid | | FK → hr_departments.id |
| description | text | | |
| created_at | timestamptz | now() | |

**UNIQUE:** (company_id, title)

---

## hr_holidays (NEW)

**Status:** ✅ New table

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Required |
| date | date | | |
| recurring | boolean | false | Repeats yearly |
| created_at | timestamptz | now() | |

**UNIQUE:** (company_id, date)

---

## hr_documents (NEW)

**Status:** ✅ New table

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| employee_id | uuid | | FK → hr_employees.id |
| name | text | | Document name |
| doc_type | text | | contract, id_document, certificate, payslip, other |
| file_url | text | | Storage URL |
| file_size | integer | | Bytes |
| uploaded_by | uuid | | FK → auth.users |
| created_at | timestamptz | now() | |

---

## Cross-Module Linkage

### HR → Company
- `hr_employees.company_id` → `companies.id`
- All HR tables scoped by company_id

### HR → Accounting
- `payroll_records` (accounting module) has `employee_id → contacts.id`
- HR payroll approval can trigger accounting journal entry for salary expenses
- **Debit:** Salary Expense → **Credit:** Cash/Bank

### Internal HR Relations
- `hr_leave_balances.employee_id` → `hr_employees.id` (auto-deduct on leave approval)
- `hr_positions.department_id` → `hr_departments.id`
- `hr_employees.reporting_manager_id` → `hr_employees.id` (self-referencing)
- `hr_documents.employee_id` → `hr_employees.id`
