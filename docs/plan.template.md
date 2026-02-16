---
title: "<short, descriptive title>"
date: YYYY-MM-DD
last_updated: YYYY-MM-DD
status: draft | in-progress | blocked | complete
category: (feat | fix | infra | architecture | docs | ops)
priority: (low | medium | high | critical)
tags:
  - tag1
---

# <Title>

## Executive Summary
A concise summary of the problem, the proposed solution, and the expected impact.

---

## Context & Motivation
- **Problem**: What is the current pain point?
- **Constraints**: Repo rules, security requirements, performance budgets.
- **References**: Links to brainstorms, related plans, or issues.

---

## Goals & Non-goals
- ✅ **Goal**: Primary objective.
- ✅ **Goal**: Measurable outcome (e.g., "Reduce type-check time by 20%").
- ❌ **Non-goal**: Explicitly out-of-scope items to prevent scope creep.

---

## Technical Design (The "How")
Provide concrete, implementation-level detail so agents can execute without guessing.

### Data Model & Schema
- **New Types**: `interface Example { ... }`
- **Validation**: `z.object({ ... })` or equivalent
- **Migrations**: If needed, list migrations and verification steps.

### API / RPC
- **Endpoints**: `POST /resource/:id/action`
- **Request Shape**: `{ id: string, mode: "expand" | "summarize" }`
- **Response Shape**: `{ success: boolean, data: ... }`
- **Auth / Access**: Required scopes, permissions, or guards.

### Component Architecture
- **New Components**: `ComponentA`, `ComponentB`
- **State Management**: Hooks, caching strategy, optimistic updates.
- **Key UI Flows**: Describe specific UX details and edge cases.

### Repo Rules / Constraints
- Apps must use RPC; no direct DB access.
- Follow design system and linting requirements.
- Note any package boundaries or ownership rules.

---

## Implementation Plan

This is the authoritative section for tracking all work. Each phase is a self-contained unit including estimates, tasks, rollout/monitoring steps, and the criteria for completion. Agents must complete all items in a phase before moving to the next.

### Phase 1: [Phase Name]
*Estimate: [e.g., 2-4 hours | 1 day]*
*Objective: [Short description]*

- [ ] **Task**: [Description of work item + file path]
- [ ] **Task**: [Description of work item + file path]
- [ ] **Rollout**: [e.g., deploy behind feature flag `FLAG_NAME`]
- [ ] **Monitoring**: [e.g., check logs for X error]

#### Phase 1 Acceptance Criteria
- [ ] [Verifiable outcome 1]
- [ ] [Verifiable outcome 2]
- [ ] **Verification Command**: `bun test path/to/test`
- [ ] **Lint/Type Check**: `pnpm -w typecheck`

---

### Phase 2: [Phase Name]
*Estimate: [e.g., 1-2 days]*
*Objective: [Short description]*

- [ ] **Task**: [Description]
- [ ] **Task**: [Description]
- [ ] **Rollout**: [e.g., ramp feature flag to 100%]
- [ ] **Cleanup**: [e.g., remove deprecated endpoints/files]

#### Phase 2 Acceptance Criteria
- [ ] [Verifiable outcome]
- [ ] [Manual verification step]
- [ ] **Verification Command**: `bun run validate-db-imports`

---

### Phase 3: [Phase Name] (Optional)
*Estimate: [Time]*
*Objective: [Short description]*

- [ ] **Task**: [Description]

#### Phase 3 Acceptance Criteria
- [ ] [Final integration test passes]
- [ ] [Documentation updated]

---

## Implementation Map (File-level)
List files to create/modify and their purpose.

- [ ] `apps/example/app/routes/new-route.tsx` — New route
- [ ] `packages/hono-rpc/src/resource.ts` — New RPC endpoint
- [ ] `packages/ui/components/Example.tsx` — UI component

---

## Risks & Mitigations
- **Risk**: [Description]
  - **Mitigation**: [Action to reduce risk]

---

## Related Work & References
- `docs/plans/2026-existing-plan.md`
- `.github/instructions/design.instructions.md`
