# Stage-0: iOS/iPadOS POS Tap-to-Pay Architecture Plan

## 1. Objective
- Define a mobile-first POS architecture for iPhone and iPad.
- Support iPhone Tap to Pay as a core receiving-payment flow.
- Keep payment flow contract-safe, idempotent, and auditable.

## 2. Scope in
- Define iPhone and iPad POS usage modes.
- Define payment handoff contract between Business App and payment provider adapter.
- Define event contracts for payment success/failure/refund.
- Define failure handling, compensation flow, and reconciliation requirements.

## 3. Scope out
- No SDK integration implementation.
- No live merchant onboarding setup.
- No production payment key rotation or environment hardening tasks.
- No multi-provider payment orchestration.

## 4. Deliverables
- Device Interaction Model (v1):
- iPhone mode: mobile checkout and Tap to Pay receiving.
- iPad mode: counter POS with order and payment station flow.
- Payment Contract Pack (v1):
- Request contract includes idempotency key and operation timestamp.
- Webhook contract includes provider event ID for deduplication.
- State model includes created, authorized, captured, failed, refunded, reconciliation_pending.
- Event Contract Pack (v1):
- commerce.payment.authorized
- commerce.payment.captured
- commerce.payment.failed
- commerce.payment.refunded
- accounting.cash.received
- accounting.refund.issued
- Reliability Rules (v1):
- Outbox pattern for event publishing.
- At-least-once delivery with consumer-side deduplication.
- Retry-safe payment confirmation with immutable operation IDs.

## 5. Risks and mitigations
- Risk: Tap to Pay capability varies by region, account status, or device eligibility.
- Mitigation: Stage-0 includes explicit capability validation gate before build start.
- Risk: Payment webhook replay or ordering issues produce duplicate accounting impact.
- Mitigation: Deduplicate by provider_event_id and enforce state transition guards.
- Risk: Payment captured but order state update fails.
- Mitigation: Mark as reconciliation_pending and trigger compensation workflow.
- Risk: POS flow becomes unusable on smaller screens.
- Mitigation: Keep iPhone flow minimal and move management-heavy tasks to iPad screens.

## 6. Acceptance checklist
- iPhone and iPad POS usage boundaries are documented and approved.
- Payment API and webhook contract drafts are documented and approved.
- Payment and accounting event naming list is documented and approved.
- Idempotency, retry, and reconciliation rules are documented and approved.
- Architecture-Guard confirms compatibility with event and migration governance.
