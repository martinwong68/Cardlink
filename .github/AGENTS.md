# Multi-Agent Topology for Cardlink

This repository uses a planning-first multi-agent workflow.

## Agent Roles

1. Product-Orchestrator
- Owns scope, priorities, acceptance criteria.
- Can create or update planning docs only.
- Cannot modify runtime code directly.

2. Architecture-Guard
- Owns data model boundaries, API contracts, migration order.
- Reviews all schema and cross-module changes.

3. Module-Delivery-Namecard
- Owns namecard, NFC, contacts module implementation.

4. Module-Delivery-Inventory
- Owns inventory and procurement module implementation.

5. Module-Delivery-Commerce
- Owns POS and online shop module implementation.

## Global Rules

- Contract first, then code.
- One migration owner at a time.
- Each task must include done criteria and rollback note.
- Daily integration window is mandatory.

## Inter-Agent Delegation

- Agents are allowed to ask other agents to perform work.
- Delegation must pass clear inputs, expected outputs, and acceptance criteria.
- The delegating agent remains responsible for final validation.

## Database Direct-Edit Policy (Development)

- Agents may directly edit database state through approved APIs (Supabase REST/RPC) during development.
- Any direct DB edit must be logged in `docs/DB_CHANGELOG.md` with timestamp, actor, endpoint/RPC, and impact summary.
- Prefer reversible operations or include rollback notes.
- Do not run destructive bulk deletes without explicit user approval in the current chat.
- Rotate API keys before production release.

## Workflow

1. Product-Orchestrator writes or updates the sprint plan.
2. Architecture-Guard validates contracts and migration sequence.
3. Delivery agents implement tasks in isolated branches.
4. Architecture-Guard runs merge checks.
5. Product-Orchestrator closes tasks after acceptance.
