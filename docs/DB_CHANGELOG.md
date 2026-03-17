# DB Change Log

Use this file to record all direct database edits performed via API/RPC during development.

## Entry Template
- Timestamp (UTC):
- Actor (agent/user):
- Environment:
- Operation type (REST insert/update/delete or RPC):
- Target (table/RPC):
- Input summary:
- Output summary:
- Impacted modules:
- Rollback note:

## Entries
- Timestamp (UTC): 2026-03-12T06:35:02Z
- Actor (agent/user): GitHub Copilot (Architecture-Guard)
- Environment: Supabase project ecfxvtqzsctbzzktoped (development)
- Operation type (REST insert/update/delete or RPC): REST update
- Target (table/RPC): public.profiles
- Input summary: Updated profile `4c754154-544c-42c9-9a3f-f536d63a00f3` (`martinwong58@gmail.com`) `business_active_company_id` from `93235790-225c-46d3-8d7a-7ce347dc2a98` to `5d911b79-d258-479f-a471-642b4feb0fb8`.
- Output summary: Update succeeded and post-read confirmed the new value persisted.
- Impacted modules: Business main-account context, company-scoped Business APIs
- Rollback note: Set `business_active_company_id` back to `93235790-225c-46d3-8d7a-7ce347dc2a98` for the same profile id.

- Timestamp (UTC): 2026-03-12T06:42:54Z
- Actor (agent/user): GitHub Copilot (Architecture-Guard)
- Environment: Supabase project ecfxvtqzsctbzzktoped (development)
- Operation type (REST insert/update/delete or RPC): Auth Admin API updateUserById
- Target (table/RPC): auth.users (password credential)
- Input summary: Reset password for `martinwong58@gmail.com` (user id `4c754154-544c-42c9-9a3f-f536d63a00f3`) to requested value.
- Output summary: Password update succeeded and sign-in verification succeeded with the new password.
- Impacted modules: Authentication login flow
- Rollback note: Reset password again via Auth Admin API to the previous credential if needed.

