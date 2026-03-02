# Cardlink Admin — Login + Billing Update Prompt

把以下整段貼到 `https://github.com/martinwong68/cardlink-admin` 的 Copilot Chat（該 repo workspace 內）執行：

```text
Implement admin login and premium display billing settings in this admin repo.

Context:
- Main app reads premium display price from DB table: public.app_billing_settings (id=1 singleton row).
- Columns used by main app:
  - monthly_display_price text
  - yearly_display_price text
  - currency_symbol text
  - updated_by uuid nullable
  - updated_at timestamptz
- Main app Stripe prices are edited manually outside this task. Do not change Stripe IDs.

Goals:
1) Add admin login flow (email/password) with role guard.
2) Add admin billing settings page to edit app_billing_settings.
3) Add server-side API/actions with zod validation and audit logs.

Requirements:

A) Login
- Create/ensure route: /admin/login
- Form fields: email, password
- Use Supabase auth sign-in.
- On success:
  - verify admin role from admin_users table (or existing role table in this repo).
  - allow only roles: super_admin, ops_admin to access billing settings.
  - redirect to /admin/billing
- On failure:
  - show clear error message

B) Role guard
- Add middleware/guard utility for admin routes.
- Guard at:
  - page level
  - server action/route handler level
- Unauthorized users:
  - redirect to /admin/login OR return 403 for APIs

C) Billing settings page
- Add route: /admin/billing
- Show current values from public.app_billing_settings where id=1:
  - monthly_display_price
  - yearly_display_price
  - currency_symbol
- Form submit updates id=1 row.
- Validation via zod:
  - monthly_display_price: non-empty string
  - yearly_display_price: non-empty string
  - currency_symbol: non-empty string max 4 chars

D) Server-side update path
- Implement secure server action or route handler:
  - GET current billing settings
  - PUT/POST update billing settings
- Use service role only on server side if needed.
- Update fields:
  - monthly_display_price
  - yearly_display_price
  - currency_symbol
  - updated_at = now()
  - updated_by = current admin mapped profile id (if available)

E) Audit log
- Write an immutable admin audit log entry on every settings update.
- Include:
  - action: billing_settings_updated
  - actor admin id
  - before/after values
  - timestamp

F) DB safety (idempotent migration in admin repo if missing)
- Add migration to ensure app_billing_settings exists and seeded:
  - row id=1 inserted if missing
- If policy missing, add read policy for app to read.
- Keep write path restricted to admin backend.

G) UX constraints
- Keep UI minimal (single form page).
- No extra pages, no extra features.

H) Deliverables
- File changes for login page, billing page, guard utility, API/action handlers, zod schema, migration, and any necessary i18n strings.
- Brief README update with:
  - how to login admin
  - how to edit premium display price
  - note that Stripe price is managed separately

After coding:
- Run lint/typecheck/tests available in this repo.
- Fix only issues related to this task.
```
