# Stage-2 Next Action Brief (Planning Only)

## 1. Objective
- Move Business interface entry out of dashboard main nav.
- Add interface switching controls inside settings only.
- Ensure bidirectional switching:
- Client GUI -> Business interface (for business users only).
- Business interface -> Client GUI (for eligible users).

## 2. Scope in
- Navigation strategy update:
- Remove Business button from main dashboard nav.
- Add Business switch entry in client settings when user is business-eligible.
- Add Client GUI switch entry in business settings.
- Access rules and eligibility checks:
- Define what counts as business user (owner/admin/manager/company-admin roles).
- Define fallback behavior when role changes mid-session.
- UX flow planning:
- Switch destination routes.
- User messaging and state persistence (last selected interface).
- Contract and acceptance planning only.

## 3. Scope out
- No runtime implementation in this planning step.
- No migration or schema changes in this planning step.
- No visual redesign outside switch entry placement rules.

## 4. Deliverables
- Interface Switching Spec (v1):
- Entry points, visibility conditions, route mapping, and fallback.
- Settings Placement Spec (v1):
- Client settings placement for Business switch.
- Business settings placement for Client switch.
- Access Control Spec (v1):
- Role eligibility matrix and unauthorized behavior.
- Acceptance and test checklist (v1).

## 5. Risks and mitigations
- Risk: Users lose access path to business interface after nav removal.
- Mitigation: Ensure settings switch is visible for eligible users and add route fallback guidance.
- Risk: Non-business users discover business routes directly.
- Mitigation: Keep server-side route guards and redirect to client GUI with message.
- Risk: Inconsistent UI state after switching.
- Mitigation: Define interface state source of truth and session-level persistence rule.

## 6. Acceptance checklist
- Main dashboard nav no longer includes Business entry in target plan.
- Client settings includes Business switch only for eligible users.
- Business settings includes Client GUI switch.
- Route guard behavior is specified for authorized and unauthorized users.
- End-to-end switch flow is defined with fallback and error handling.

## 7. New Chat Prompt (Copy and Start)
Use this prompt in a new chat:

You are Product-Orchestrator + Architecture-Guard for Cardlink. Planning-only first.

Task:
1) Plan interface switching so Business is not in main dashboard nav.
2) Add Business switch inside client settings only when user is business-eligible.
3) In Business interface settings, add switch back to Client GUI.
4) Define role eligibility matrix and route guard behavior.
5) Define acceptance checklist and test scenarios.
6) Do not implement code yet until I confirm.

Constraints:
- Follow contract-first workflow.
- Keep backward compatibility and safe redirects.
- No schema changes unless explicitly required and approved.

Output format:
1. Objective
2. Scope in
3. Scope out
4. Module boundaries
5. API/event contract impact
6. Agent task board
7. Risks and mitigations
8. Acceptance checklist
9. Founder actions
