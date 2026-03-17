# Stage-3 Smoke Test Record

## Objective
- Verify active-company tenancy control and cross-company write blocking across Business modules.

## Test Matrix
| ID | Module | Scenario | Expected | Result |
|---|---|---|---|---|
| S3-SM-01 | Main Account | Load main-account context with managed companies | Active company resolved and managed list returned | Not executed in this run |
| S3-SM-02 | Main Account | Quick-switch to another managed company | `profiles.business_active_company_id` updates via API | Not executed in this run |
| S3-SM-03 | Inventory | POST product (real DB insert by active company) | Product persisted in `inv_products` | Blocked (needs authenticated seeded test account) |
| S3-SM-04 | Inventory | POST movement stock-in then valid stock-out | Balance changes and movement rows persisted | Blocked (needs authenticated seeded test account) |
| S3-SM-05 | Inventory | POST movement stock-out causing negative on_hand | API returns 409 conflict | Blocked (needs authenticated seeded test account) |
| S3-SM-06 | Inventory | POST movement with mismatched `company_id` | API returns 403 deny | Blocked (needs authenticated seeded test account) |
| S3-SM-07 | Procurement | POST supplier (real DB insert) | Supplier persisted in `proc_suppliers` | Blocked (needs authenticated seeded test account) |
| S3-SM-08 | Procurement | POST PO with items then POST receipt | Receipt writes and inventory stock-in movements created | Blocked (needs authenticated seeded test account) |
| S3-SM-09 | Procurement | Over-receive on receipt item qty | API returns 409 conflict | Blocked (needs authenticated seeded test account) |
| S3-SM-10 | Procurement | Payload `company_id` mismatch on write APIs | API returns 403 deny | Blocked (needs authenticated seeded test account) |
| S3-SM-11 | POS | POST checkout intent with idempotency key then replay | First create, second idempotent replay | Blocked (needs authenticated seeded test account) |
| S3-SM-12 | POS | POST webhook replay same provider/provider_event_id | Duplicate event dedup is replay-safe | Blocked (needs authenticated seeded test account) |
| S3-SM-13 | POS | Invalid state transition (e.g. failed -> captured) | API returns 409 conflict | Blocked (needs authenticated seeded test account) |
| S3-SM-14 | POS | Payload `company_id` mismatch on write APIs | API returns 403 deny | Blocked (needs authenticated seeded test account) |
| S3-SM-15 | Company Cards | POST create-account with no `companyId` | API accepts and binds to active company context | Not executed in this run |
| S3-SM-16 | Company Cards | POST create-account with mismatched `companyId` | API returns 403 deny | Not executed in this run |
| S3-SM-17 | Company Cards | POST /api/company-cards/cards for existing-member with mismatched `companyId` | API returns 403 deny | Not executed in this run |
| S3-SM-18 | Company Cards | DELETE /api/company-cards/cards/:cardId for card outside active company | API returns 403 deny | Not executed in this run |
| S3-SM-19 | Company Cards | POST /api/company-cards/profile-card from Business scope | API creates/returns active-company profile card only | Not executed in this run |
| S3-SM-20 | Company Management | PATCH /api/company-management/profile with mismatched `company_id` | API returns 403 deny | Not executed in this run |
| S3-SM-21 | Company Management | POST/PATCH/DELETE offer routes with active-company context | API writes succeed only in active scope | Not executed in this run |
| S3-SM-22 | Company Management | PATCH redemption decision for redemption outside active company | API returns 403 deny | Not executed in this run |
| S3-SM-23 | Company Management | PATCH membership tier requirement where tier not in active company | API returns 403 deny | Not executed in this run |

## Build/Lint Validation
- `npm run build` (in `cardlink/`): Pass
- `npx eslint` on changed API files: Pass
- `npm run lint` (full project): Fails on pre-existing unrelated lint debt in dashboard/community pages.

## Notes
- Functional smoke requiring DB writes could not run without authenticated test credentials and fixture data in current CLI context.
- POS provider-direct integration still needs signed webhook contract slice for production hardening.
- Executed probe evidence in this run:
	- `GET /api/inventory/products` without scope header => 403
	- `GET /api/procurement/suppliers` without scope header => 403
	- `GET /api/inventory/products` with `x-cardlink-app-scope: business` and no session => 401
	- `POST /api/inventory/products` with `x-cardlink-app-scope: business` and no session => 401
