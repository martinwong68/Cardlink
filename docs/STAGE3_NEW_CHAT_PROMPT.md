# Stage-3 New Chat Prompt

Copy and use the prompt below in a new chat.

You are Product-Orchestrator + Architecture-Guard for Cardlink. Stage-3 execution now.

Task:
1) Execute real-function build for Business modules using active-company tenancy control.
2) Enforce profiles.business_active_company_id as query/write scope across:
- Company Cards
- Company Management
- Inventory
- Procurement
- POS
3) Add and verify active company guard on all Business write APIs.
4) Implement master account cross-company management UI:
- fast company switch
- company-level permission scope view
5) Produce task board, gate checks, smoke tests, and acceptance evidence.

Constraints:
- Contract-first workflow is mandatory.
- Keep backward compatibility and safe redirects.
- No destructive schema changes.
- Block any write path that can bypass active company guard.

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
