# Remove Deprecated success() and error() RPC Functions

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `refactor-remove-deprecated-rpc-functions-plan` |
| Merge Date | `2026-03-10` |
| Status | `Completed (retrospective merge from archived plan)` |
| Tech Lead | `API` |
| Team | `API + Platform` |
| Primary Repo | `hackefeller/hominem` |
| Source Plan | `docs/plans/archive/2026-01-29-refactor-remove-deprecated-rpc-functions-plan.md` |
| Evidence Commits | `2ac6d21f`, `99a0856b` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Deprecated `success()` / `error()` wrappers persisted in API routes despite modern typed error middleware. |
| Outcome | The migration objective was completed and wrapper-based response handling was replaced with direct JSON success returns and typed thrown errors. |
| Business/User Impact | Cleaner API contracts, lower maintenance overhead, and more consistent error semantics. |
| Delivery Shape | `Phased` |

The archived plan documented a structured multi-phase migration path with explicit quality gates. Subsequent implementation and architecture cleanup completed the intended transition away from deprecated wrappers.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Wrapper removal | Replace route-level `success()` and `error()` call sites with direct returns and typed exceptions. |
| Error-path standardization | Ensure route handlers rely on shared middleware behavior for conversion to HTTP responses. |
| API surface cleanup | Remove deprecated exports/imports after call-site migration. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Re-architecting unrelated route domains | Work constrained to deprecated response-wrapper migration concerns. |
| Rewriting all legacy typing issues in one pass | Broader typing debt handled by adjacent initiatives. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Deprecated wrapper usage | `143` stated instances across route files | `0` remaining wrapper calls | Migration completed and pattern retired in active API paths |
| Response handling patterns | Mixed wrapper + middleware usage | Unified typed error middleware pattern | Achieved in modern route implementations |
| Export surface clarity | Deprecated APIs still exported | Remove deprecated exports | Completed as part of cleanup track |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Throw typed service errors for failure paths | Return wrapped error payloads, mixed pattern, typed throws | Aligns with centralized middleware and simplifies handlers | Requires consistent import discipline for error classes |
| Return direct `c.json<Type>(data, 200)` for success | Wrapper envelopes, implicit return shape | Reduces boilerplate and preserves explicit response typing | Historical docs/tests required updates |
| Remove deprecated APIs after migration | Keep deprecated APIs indefinitely | Prevents pattern regression and reduces confusion | Requires complete call-site audit first |

### 5.1 Final Architecture

Routes return direct success payloads and throw typed errors. Shared middleware owns translation into standardized HTTP error responses, removing the need for route-local wrapper logic.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Migration planning | Created phase-based migration and risk matrix | API | `done` |
| Route adoption | Replaced wrapper calls in prioritized route batches | API | `done` |
| Cleanup and guardrails | Removed deprecated exports and validated no remaining references | Platform + API | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `docs/plans/archive/2026-01-29-refactor-remove-deprecated-rpc-functions-plan.md` | `removed` | Superseded by this canonical merged record |
| `openspec/merged/2026-03-10-refactor-remove-deprecated-rpc-functions-plan.md` | `added` | Canonical merged artifact |
| RPC route response/error pattern | `updated` | Wrapper-based handling retired in favor of typed middleware flow |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Merge archived plan into canonical record and retire superseded plan artifact |
| Ordering | Capture objectives and completed outcomes, then update index and remove old source file |
| Safety Controls | Documentation migration only at this step |
| Rollback | Recover retired plan file from git if traceability adjustments are needed |
| Residual Risk | Legacy references outside merged docs may still mention wrapper helpers |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Source audit | Reviewed archived plan details and acceptance criteria | `pass` | `docs/plans/archive/2026-01-29-refactor-remove-deprecated-rpc-functions-plan.md` |
| History audit | Confirmed provenance commits | `pass` | `2ac6d21f`, `99a0856b` |
| Merged index sync | Added row and sorted index entries | `pass` | `openspec/merged/README.md` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Plan-reported counts may differ from final route totals after parallel refactors | Low | Keep canonical statement focused on achieved pattern state |
| Some historical internal references may still point to removed plan path | Low | Update references as part of docs hygiene follow-up |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Not applicable for merge-doc replacement |
| Dependencies | Repository history and merged documentation index |
| Monitoring | Continue standard API error-rate monitoring in normal operations |
| Incident Response | Use typed middleware path and route regression tests |
| Rollback Trigger | Documentation traceability regressions |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none` | Documentation-only migration action |
| Data handling impact | `none` | No schema/data changes |
| Secrets/config changes | `no` | None required |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Deprecations need enforced end-of-life dates | Add explicit removal milestones when marking APIs deprecated |
| Centralized middleware patterns reduce route complexity | Keep route handlers focused on business logic and typed IO |
| Quality gates in plans improve confidence for broad refactors | Preserve explicit verification sections in future refactor plans |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Add lint guard against introducing deprecated wrapper response helpers in new route code | `API` | `P1` | `2026-03-21` | `open` |
| `F-002` | Sweep internal docs for stale references to `success()` / `error()` helpers | `Platform` | `P2` | `2026-03-28` | `open` |
