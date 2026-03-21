# HR Module (Employees, Leave, Attendance, Payroll)

> Auto-generated from Supabase database on 2025-07-21
> 4 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

- [hr_employees](#hr_employees) — 0 rows
- [hr_leave_requests](#hr_leave_requests) — 0 rows
- [hr_attendance](#hr_attendance) — 0 rows
- [hr_payroll](#hr_payroll) — 0 rows

---

## hr_employees

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Employee name |
| email | text | | |
| phone | text | | |
| position | text | | Job title |
| department | text | | |
| status | text | 'active' | active, on_leave, terminated |
| hire_date | date | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for all operations

### Referenced By

| Table | Column |
|-------|--------|
| hr_leave_requests | employee_id |
| hr_attendance | employee_id |
| hr_payroll | employee_id |

---

## hr_leave_requests

**Status:** ✅ Exists (0 rows)
**FK:** employee_id → hr_employees.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| employee_id | uuid | | FK → hr_employees.id |
| leave_type | text | | annual, sick, personal, etc. |
| start_date | date | | |
| end_date | date | | |
| status | text | 'pending' | pending, approved, rejected |
| reason | text | | |
| approved_by | uuid | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## hr_attendance

**Status:** ✅ Exists (0 rows)
**FK:** employee_id → hr_employees.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| employee_id | uuid | | FK → hr_employees.id |
| date | date | | |
| check_in | timestamptz | | |
| check_out | timestamptz | | |
| status | text | | present, absent, late, half_day |
| notes | text | | |
| created_at | timestamptz | now() | |

---

## hr_payroll

**Status:** ✅ Exists (0 rows)
**FK:** employee_id → hr_employees.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| employee_id | uuid | | FK → hr_employees.id |
| period | text | | e.g. "2025-07" |
| basic_salary | numeric | | |
| allowances | numeric | 0 | |
| deductions | numeric | 0 | |
| net_salary | numeric | | |
| status | text | 'draft' | draft, approved, paid |
| paid_at | timestamptz | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## Cross-Module Linkage

### HR → Company
- `hr_employees.company_id` → `companies.id`

### HR → Accounting
- `payroll_records` (accounting module) has `employee_id → contacts.id`
- HR payroll approval can trigger accounting journal entry for salary expenses
- **Debit:** Salary Expense → **Credit:** Cash/Bank
