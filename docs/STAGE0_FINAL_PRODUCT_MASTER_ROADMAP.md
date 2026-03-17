# Stage-0: Final Product Master Roadmap

## 1. Objective
- Define the full-product plan before MVP build starts.
- Align final-state architecture, staged delivery sequence, and gate-based acceptance.
- Ensure roadmap supports dual-app strategy: minimized Client App and Business-first development.

## 2. Scope in
- Final-state roadmap across namecard, inventory, procurement, POS, online shop, accounting, HR, and channel.
- Stage-based sequencing from foundation to scale.
- Week-by-week planning for the first month.
- Cross-module acceptance gates and out-of-scope controls.

## 3. Scope out
- No feature implementation.
- No timeline commitment beyond planning confidence ranges.
- No production launch date commitment in Stage-0.
- No expansion into non-MVP enterprise-heavy scenarios.

## 4. Deliverables
- Final Product Stage Plan (v1):
- Stage 0: Planning and contract freeze.
- Stage 1: Business App core platform setup.
- Stage 2: Operational modules thin-slice integration.
- Stage 3: Commerce and channel expansion.
- Stage 4: Mobile excellence and stabilization.
- First-Month Weekly Plan (v1):
- Week 1: Scope lock, module boundaries, contract and event freeze.
- Week 2: Inventory + procurement + POS core thin-slice contract validation.
- Week 3: Online shop + accounting + HR + channel integration contract validation.
- Week 4: End-to-end acceptance, risk closure, and build-readiness review.
- Gate Model (v1):
- Gate A: App boundary approval.
- Gate B: DB/API/event contract approval.
- Gate C: Migration order, RLS, and rollback approval.
- Gate D: Mobile POS capability and reconciliation approval.

## 5. Risks and mitigations
- Risk: Scope creep breaks one-month MVP focus.
- Mitigation: Enforce strict out-of-scope list and defer non-core items.
- Risk: Cross-module assumptions diverge between agents.
- Mitigation: Product-Orchestrator publishes single source roadmap and Architecture-Guard signs gates.
- Risk: App separation introduces delivery overhead.
- Mitigation: Keep shared backend contracts stable and app responsibilities strict.
- Risk: Mobile POS reliability gaps impact trust.
- Mitigation: Require reconciliation and failure-mode acceptance before build gate.

## 6. Acceptance checklist
- Final-stage roadmap is documented and approved.
- First-month weekly roadmap is documented and approved.
- Gate model and ownership are documented and approved.
- Out-of-scope controls are documented and approved.
- Build cannot start until all Stage-0 gates are signed.
