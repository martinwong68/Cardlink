# Booking Module (Services, Availability, Appointments)

> Auto-generated from Supabase database on 2025-07-21
> 3 tables | All verified ✅ in live DB (currently 0 rows)

---

## Table of Contents

- [booking_services](#booking_services) — 0 rows
- [booking_availability](#booking_availability) — 0 rows
- [booking_appointments](#booking_appointments) — 0 rows

---

## booking_services

**Status:** ✅ Exists (0 rows)
**FK:** company_id → companies.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| company_id | uuid | | FK → companies.id |
| name | text | | Service name |
| description | text | | |
| duration_minutes | int | | |
| price | numeric | | |
| currency | text | 'HKD' | |
| is_active | boolean | true | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### RLS

- `can_manage_company(company_id)` for management
- Public can read active services

### Referenced By

| Table | Column |
|-------|--------|
| booking_availability | service_id |
| booking_appointments | service_id |

---

## booking_availability

**Status:** ✅ Exists (0 rows)
**FK:** service_id → booking_services.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| service_id | uuid | | FK → booking_services.id |
| day_of_week | int | | 0=Sunday, 6=Saturday |
| start_time | time | | |
| end_time | time | | |
| max_bookings | int | 1 | Concurrent booking limit |
| created_at | timestamptz | now() | |

---

## booking_appointments

**Status:** ✅ Exists (0 rows)
**FK:** service_id → booking_services.id

### Columns

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | | |
| service_id | uuid | | FK → booking_services.id |
| customer_name | text | | |
| customer_email | text | | |
| customer_phone | text | | |
| booking_date | date | | |
| start_time | time | | |
| end_time | time | | |
| status | text | 'confirmed' | confirmed, cancelled, completed, no_show |
| notes | text | | |
| booked_by | uuid | | FK → auth.users (if logged in) |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## Cross-Module Linkage

### Booking → Company
- `booking_services.company_id` → `companies.id`

### Booking → POS (potential)
- Completed appointments could generate POS orders for payment
- Service price could be recorded as revenue in accounting

### Booking → CRM (potential)
- Customer email from bookings could create or match CRM contacts
- Booking history could feed into customer activity tracking
