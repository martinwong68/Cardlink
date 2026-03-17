# Agent Operating Model for Solo Founder + AI

## 1) Recommended Agent Topology

Use a 3-layer model, not only one mother agent.

- Layer A: Product Orchestrator Agent
  - Owns roadmap, scope lock, acceptance criteria.
  - Decides what is in or out for current week.

- Layer B: Architecture Guard Agent
  - Owns schema rules, API contracts, and module boundaries.
  - Blocks conflicting migration or contract changes.

- Layer C: Delivery Agents (module-specific)
  - Inventory Agent
  - POS Agent
  - Accounting Agent
  - HR Agent
  - Namecard Agent
  - Each implements tasks within approved contracts only.

## 2) Why this is safer than one mother agent only

- One mother agent can become a bottleneck and miss low-level conflicts.
- Architecture guard catches cross-module crashes early.
- Delivery agents can run faster with narrow ownership.

## 3) Anti-Collision Rules

1. One owner per file area in active sprint.
2. One migration author at a time.
3. Contract-first workflow: API/schema before implementation.
4. Daily merge window with smoke tests.
5. No direct edits to other module internals without architecture approval.

## 4) Shared Artifacts (single source of truth)

- docs/MARCH_2026_MVP_EXECUTION_PLAN.md
- docs/AGENT_OPERATING_MODEL.md
- docs/contracts/<module>-contracts.md
- migrations/ (ordered SQL source of truth)

## 5) Task Lifecycle

1. Draft task with acceptance criteria.
2. Architecture guard validates dependencies and contracts.
3. Delivery agent implements in isolated branch.
4. Run smoke checks and lint.
5. Merge only in integration window.
6. Update changelog and task status.

## 6) Minimum QA Gates per task

- Build passes.
- Affected module page loads.
- One create/update/read cycle succeeds.
- No migration conflict.

## 7) Prompt Template for Sub-Agents

Role:
- You are the <Module> Delivery Agent.

Constraints:
- Do not modify schema or contracts outside your scope.
- Do not edit migration files unless explicitly assigned.
- Keep changes small and atomic.

Task:
- Implement <feature> in <path>.

Output required:
- Files changed.
- Why this is safe.
- Test steps.
- Known limitations.

## 8) Weekly Ceremony (solo-friendly)

- Monday: scope lock and dependency map.
- Daily: 20-minute integration and conflict review.
- Friday: demo, bug triage, next-week planning.

## 9) Build-vs-Open-Source Rule

- Build core business flows inside this codebase.
- Reuse open-source only for non-core accelerators:
  - UI primitives
  - charting
  - table/grid
  - workflow utility
- Avoid adopting a full ERP codebase as core in month-one.
