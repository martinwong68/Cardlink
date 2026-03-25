# Booking Module (Services, Availability, Appointments, Settings, Customers)

> Auto-generated from Supabase database on 2025-07-21
> Updated 2026-03-25 with Phase 1 rebuild tables and columns
> 6 tables | All verified ✅ in live DB

---

## Table of Contents

- [booking_services](#booking_services) — 0 rows
- [booking_availability](#booking_availability) — 0 rows
- [booking_appointments](#booking_appointments) — 0 rows
- [booking_settings](#booking_settings) — 0 rows
- [booking_date_overrides](#booking_date_overrides) — 0 rows
- [booking_customers](#booking_customers) — 0 rows

---

## booking_services

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns (16)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Service name (NOT NULL) |
| description | text | | |
| duration_minutes | int | 60 | |
| price | numeric | 0 | |
| category | text | | Service category |
| is_active | boolean | true | |
| max_concurrent | int | 1 | Max concurrent bookings |
| buffer_before_mins | int | 0 | Buffer time before appointment |
| buffer_after_mins | int | 0 | Buffer time after appointment |
| min_notice_hours | int | 0 | Minimum advance notice |
| max_advance_days | int | 90 | Max days in advance to book |
| image_url | text | | |
| sort_order | int | 0 | Display order |
| created_at | timestamptz | now() | |

### RLS

- Company members can manage services
- Public can read active services

### Referenced By

| Table | Column |
|-------|--------|
| booking_availability | service_id |
| booking_appointments | service_id |
| booking_date_overrides | service_id |

---

## booking_availability

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, service_id → booking_services.id

### Columns (8)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| service_id | uuid | | FK → booking_services.id (nullable) |
| day_of_week | int | | 0=Sunday, 6=Saturday |
| start_time | time | | |
| end_time | time | | |
| is_available | boolean | true | |
| created_at | timestamptz | now() | |

---

## booking_appointments

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, service_id → booking_services.id

### Columns (17)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| service_id | uuid | | FK → booking_services.id |
| customer_name | text | | NOT NULL |
| customer_email | text | | |
| customer_phone | text | | |
| customer_user_id | uuid | | FK → auth.users (if logged in) |
| customer_id | uuid | | FK → booking_customers.id |
| appointment_date | date | | NOT NULL |
| start_time | time | | NOT NULL |
| end_time | time | | NOT NULL |
| status | text | 'pending' | pending, confirmed, cancelled, completed, no_show |
| notes | text | | |
| total_price | numeric | 0 | |
| cancellation_reason | text | | |
| rescheduled_from_id | uuid | | FK → booking_appointments.id |
| source | text | 'admin' | admin, public, api |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## booking_settings

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Company-level booking configuration.

### Columns (12)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id (UNIQUE) |
| auto_confirm | boolean | false | Auto-confirm new bookings |
| timezone | text | 'Asia/Kuala_Lumpur' | |
| slot_interval_mins | int | 30 | Time slot interval |
| cancellation_notice_hours | int | 0 | Required notice for cancellation |
| cancellation_policy | text | | Policy text |
| booking_page_title | text | | |
| booking_page_description | text | | |
| require_phone | boolean | false | |
| require_email | boolean | true | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- Company members can manage settings
- Public can read settings

---

## booking_date_overrides

**Status:** ✅ Exists (0 rows)
**FKs:** company_id → companies.id, service_id → booking_services.id
**Description:** Date-specific exceptions (closures, special hours).

### Columns (7)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| service_id | uuid | | FK → booking_services.id (nullable) |
| override_date | date | | |
| is_closed | boolean | false | Closed on this date |
| start_time | time | | Custom hours if not closed |
| end_time | time | | |
| reason | text | | |
| created_at | timestamptz | now() | |

---

## booking_customers

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id
**Description:** Dedicated customer directory for bookings.

### Columns (10)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | NOT NULL |
| email | text | | |
| phone | text | | |
| notes | text | | |
| user_id | uuid | | FK → auth.users |
| total_bookings | int | 0 | |
| total_spent | numeric | 0 | |
| last_visit_date | date | | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### Referenced By

| Table | Column |
|-------|--------|
| booking_appointments | customer_id |

---

## Database Functions

### `check_booking_conflicts`

```sql
check_booking_conflicts(
  p_company_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_id uuid DEFAULT NULL
) → TABLE(conflict_id uuid, conflict_customer text, conflict_start time, conflict_end time)
```

**Description:** Checks for overlapping confirmed bookings. Used for double-booking prevention.

### `get_available_slots`

```sql
get_available_slots(
  p_company_id uuid,
  p_service_id uuid,
  p_date date
) → TABLE(slot_start time, slot_end time)
```

**Description:** Calculates available time slots for a given date, respecting availability, date overrides, buffer times, and concurrent booking limits.

---

## Cross-Module Linkage

### Booking → Company
- `booking_services.company_id` → `companies.id`
- All booking tables scoped by company_id

### Booking → POS (potential)
- Completed appointments could generate POS orders for payment
- Service price could be recorded as revenue in accounting

### Booking → CRM (potential)
- Customer email from bookings could create or match CRM contacts
- Booking history could feed into customer activity tracking
