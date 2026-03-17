# Namecard Contract (Sprint-1 Baseline)

## Objective
- Define Namecard ownership and migration-safe contracts for Business App transition.

## Scope in
- Company card management ownership move to Business App.
- Public card and tap behavior remains backward-compatible.
- Lead capture event naming baseline.

## Scope out
- No full template engine redesign.
- No billing entitlement logic change.
- No non-namecard module behavior changes.

## API Contract (v1)
- GET /api/namecard/cards
- POST /api/namecard/cards
- PATCH /api/namecard/cards/:cardId
- POST /api/namecard/leads
- POST /api/company-cards/create-account
- POST /api/company-cards/cards
- DELETE /api/company-cards/cards/:cardId
- POST /api/company-cards/profile-card

## Event Contract (v1)
- namecard.card.created
- namecard.card.updated
- namecard.tap.recorded
- namecard.lead.captured

## Payload Baseline
- event_id
- event_name
- occurred_at
- company_id
- correlation_id
- idempotency_key
- payload_version

## Backward Compatibility
- Existing public route /c/:slug remains valid.
- Existing tap route /tap/:uid remains valid.
- Existing dashboard entry points may redirect, but behavior must remain available.
- Existing payload field `companyId` remains optional/compatible, but server write scope is enforced by active company context.

## Risks and mitigations
- Risk: split write ownership during migration.
- Mitigation: enforce Business App as single write owner and keep Client entry points redirect-only.

## Acceptance checklist
- API endpoints and event names are documented.
- Compatibility guarantees for /c and /tap are documented.
- Redirect strategy for old management entry points is documented.
