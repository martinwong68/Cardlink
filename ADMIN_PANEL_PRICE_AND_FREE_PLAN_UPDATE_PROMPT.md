# Admin Panel Update Prompt (Pricing + Free Plan Limits)

Use this prompt in your Admin Panel repo/agent:

```text
You are updating the CardLink Admin Panel and database integration.

Goal:
1) Admin can edit the Premium plan display price shown in the main app.
2) Stripe price is managed manually outside this task.
3) Free users are limited to:
   - max 2 contact fields
   - max 2 links
   - no experience records

Existing main-app DB changes already expected:
- Table: public.app_billing_settings
  Columns:
    - id integer primary key, must be 1
    - monthly_display_price text not null (example: '9.99')
    - yearly_display_price text not null (example: '99')
    - currency_symbol text not null (example: '$')
    - updated_by uuid null references public.profiles(id)
    - created_at timestamptz not null
    - updated_at timestamptz not null
  RLS:
    - read allowed to anon/authenticated
    - writes should be done by admin backend (service role) or controlled admin endpoint only

- DB guard functions/triggers enforce free-plan content limits on:
  - public.card_fields (max 2 for free-plan card owner)
  - public.card_links (max 2 for free-plan card owner)
  - public.card_experiences (disallowed for free-plan card owner)

Tasks for Admin Panel implementation:
1) Add page/section: /admin/billing (or equivalent) for Premium display pricing.
2) Fields in UI:
   - monthly_display_price (text)
   - yearly_display_price (text)
   - currency_symbol (text)
3) API endpoint (server-side only):
   - GET current billing settings
   - POST/PUT update billing settings row id=1
4) Security:
   - only super_admin / ops_admin can update
   - validate payload using zod
   - write audit log to admin_audit_logs for updates
5) On update:
   - update monthly_display_price, yearly_display_price, currency_symbol
   - set updated_at = now()
   - set updated_by = current admin mapped profile id when available
6) Keep Stripe IDs and Stripe checkout prices unchanged in this task.
7) Include migration compatibility checks:
   - if app_billing_settings missing, create it idempotently
   - ensure row id=1 exists

Output requirements:
- UI form + API handler + role guard + zod schema + audit log write
- clear error messages and success toast
- README section: "Premium display pricing is UI-only; Stripe pricing is managed separately"
```
