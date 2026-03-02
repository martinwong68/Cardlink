# Admin Panel Prompt — Subscription End Time + NFC Premium Duration Batch

把以下整段貼到 `cardlink-admin` repo 的 Copilot Chat：

```text
Implement subscription tracking visibility and NFC premium duration batch requirement in admin panel.

Context from main app DB:
1) profiles now includes:
   - stripe_subscription_id text
   - stripe_subscription_status text
   - stripe_subscription_current_period_end timestamptz
   - nfc_premium_until timestamptz
   - premium_until timestamptz
   - plan (free|premium) already exists
2) nfc_cards now includes:
   - premium_duration_months integer NOT NULL (required)
   - premium_grant_applied_at timestamptz
   - premium_granted_until timestamptz
   - premium_granted_to_user_id uuid
3) Existing cards are backfilled to premium_duration_months=36 (3 years).

Goals:
A) Admin can see user subscription timeline.
B) NFC batch generation form must require premium duration per card.
C) Batch-created NFC cards must persist premium_duration_months.

Requirements:

1) User subscription admin view
- Add/extend admin user detail page to display:
  - stripe_subscription_status
  - stripe_subscription_current_period_end
  - nfc_premium_until
  - premium_until
  - current plan
- Render clear badges:
  - Premium active if premium_until > now
  - Free otherwise

2) NFC batch form (required duration)
- In NFC batch generation form, add REQUIRED field:
  - premium_duration_months (integer)
- Validation:
  - must be present
  - must be integer > 0
  - support quick presets: 12 and 36 (UI convenience)
- Do not allow submit when missing/invalid.

3) Batch create write path
- Ensure each created nfc_cards row writes premium_duration_months.
- Keep other existing fields unchanged.
- If your batch API currently writes with service role, keep that pattern.

4) API and schema validation
- Add zod schema for batch payload:
  - items[]
  - each item must include premium_duration_months
- Return user-friendly validation errors.

5) Audit log
- For each batch creation, write admin_audit_logs entry:
  - action: nfc_batch_created
  - include duration values in payload
  - actor admin id
  - timestamp

6) UX constraints
- Minimal UI updates only.
- No new pages unless needed.
- No extra features unrelated to duration requirement.

Deliverables:
- Updated batch form UI
- Updated API/server action + zod validation
- DB insert includes premium_duration_months
- Audit log payload includes duration
- Small README note for the required duration field
```
