# Performance Roadmap: Path to Sub-Second Type Checking

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `performance-roadmap` |
| Merge Date | `2026-03-10` |
| Status | `Completed (retrospective merge from archived plan)` |
| Tech Lead | `Platform` |
| Team | `Platform + API` |
| Primary Repo | `hackefeller/hominem` |
| Source Plan | `docs/plans/archive/2026-01-29-performance-roadmap.md` |
| Evidence Commits | `2ac6d21f`, `60de87f5`, `99a0856b` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | TypeScript type-check and inference cost was creating slower local feedback loops and high editor overhead. |
| Outcome | The roadmap goals were absorbed into the broader type/RPC optimization program and implemented through import standardization, type generation, and route typing cleanup. |
| Business/User Impact | Faster iteration for engineers and lower risk of type-related regressions. |
| Delivery Shape | `Phased` |

This document replaces the archived roadmap plan and records what actually landed. The original plan proposed quick wins, architecture work, and optional nuclear steps. In practice, the architecture track delivered most gains without needing broad disruptive fallback steps.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Type-check performance objective | Established and tracked objective of `<1s` local incremental checks for common workflows. |
| Types-first direction | Planned migration toward explicit domain types and reduced deep inference across package boundaries. |
| Validation framing | Defined repeatable validation gates around `bun run typecheck` and CI stability. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Full legacy RPC replacement in one batch | Addressed incrementally by adjacent architecture changes, not as an isolated one-shot rewrite. |
| Toolchain replacement as first-line action | SWC/nuclear options documented as fallback only and not required for primary outcomes. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Per-app type-check responsiveness | `~6s-18s` in plan baseline | `<1s` incremental developer loop | Achieved via follow-on implementation program (`~sub-second` path captured in merged optimization docs) |
| Type-check memory profile | Elevated for large inference graphs | `<100MB` for targeted apps | Improved through reduced global inference pressure; measured in the broader optimization workstream |
| Legacy pattern surface | Mixed old/new response and type flows | Consistent modern patterns | Core migration achieved across API and shared typing surfaces |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Sequence quick wins before deep refactors | Big-bang redesign, phased progression | Lower delivery risk while preserving option value | Some intermediate states required temporary dual patterns |
| Prefer types-first explicit domain boundaries | Continue broad inferred barrels, add cache tweaks only | Better long-term maintainability and predictable type behavior | Required widespread import/type adjustments |
| Keep nuclear options as contingency | Immediate hard cutovers | Prevented unnecessary disruption once primary path delivered | More planning overhead up front |

### 5.1 Final Architecture

Performance improvements came primarily from reducing global type inference, moving to explicit typed boundaries, and tightening route/client typing contracts. This aligned with the plan’s Phase 2 focus and made Phase 3 contingencies mostly unnecessary.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Planning and target-setting | Defined phased execution and concrete performance goals | Platform | `done` |
| Execution integration | Goals incorporated into TypeScript/Drizzle and RPC architecture efforts | Platform + API | `done` |
| Verification normalization | Standardized checks around typecheck and CI outcomes | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `docs/plans/archive/2026-01-29-performance-roadmap.md` | `removed` | Superseded by this canonical merged record |
| `openspec/merged/2026-03-10-performance-roadmap.md` | `added` | Canonical merged artifact |
| Monorepo type-check workflow | `updated` | Performance and reliability validation became routine quality gates |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Retrospective merge of archived plan into canonical OpenSpec merged ledger |
| Ordering | Capture source plan intent, record actual delivery path, retire superseded plan file |
| Safety Controls | Documentation-only migration; no runtime behavior changed by this merge step |
| Rollback | Restore removed plan from git history if needed |
| Residual Risk | Some legacy references may still point to the old archive location |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Source audit | Confirmed archived roadmap content and goals | `pass` | `docs/plans/archive/2026-01-29-performance-roadmap.md` |
| History audit | Verified provenance and change activity | `pass` | `2ac6d21f`, `60de87f5`, `99a0856b` |
| Index consistency | Merged index updated to include this document | `pass` | `openspec/merged/README.md` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Original plan lacked direct run artifact links | Low | Use commit-level evidence and cross-reference merged optimization documents |
| Performance metrics were distributed across related initiatives | Low | Preserve explicit linkage in follow-up documentation hygiene |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Not applicable for this merge-doc replacement |
| Dependencies | Existing merged optimization records and repo commit history |
| Monitoring | Not applicable |
| Incident Response | Not applicable |
| Rollback Trigger | Documentation indexing or traceability regression |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none` | Documentation migration only |
| Data handling impact | `none` | No schema/data modifications |
| Secrets/config changes | `no` | None required |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Performance plans should include explicit evidence anchors at authoring time | Require a validation evidence section in new planning docs |
| Large optimization programs benefit from canonical consolidation | Continue replacing fragmented archive plans with merged records |
| Keeping fallback options explicit improves confidence | Preserve contingency paths but retire them when no longer needed |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Add explicit pointer from related optimization merged docs back to this roadmap record | `Platform` | `P2` | `2026-03-24` | `open` |
| `F-002` | Standardize evidence field conventions for future merged documents | `Platform` | `P2` | `2026-03-31` | `open` |
