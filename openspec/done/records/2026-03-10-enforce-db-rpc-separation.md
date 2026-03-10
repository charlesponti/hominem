# Enforce Clear Database/RPC Separation

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `enforce-db-rpc-separation` |
| Merge Date | `2026-03-10` |
| Status | `Completed (retrospective merge from archived plan)` |
| Tech Lead | `API Architecture` |
| Team | `API + Apps + Platform` |
| Primary Repo | `hackefeller/hominem` |
| Source Plan | `docs/plans/archive/2026-02-03-enforce-db-rpc-separation.md` |
| Evidence Commits | `99a0856b` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | App packages had direct and type-only dependencies on `@hominem/db`, violating intended architecture boundaries. |
| Outcome | The boundary was clarified and enforced: apps consume RPC contracts, while database access remains inside server-side layers. |
| Business/User Impact | Better maintainability, tighter security posture, and cleaner separation of concerns. |
| Delivery Shape | `Phased architecture hardening` |

This merged record supersedes the archived architecture hardening plan and captures the completed boundary model plus enforcement intent.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Boundary definition | Formalized rule that only RPC/server layers may touch `@hominem/db`. |
| App migration | Move app runtime/type dependencies toward RPC client/API contract usage. |
| Enforcement and guidance | Codify rules in validation and documentation to prevent regressions. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Reworking all data-domain models at once | Objective focused on boundary integrity, not domain redesign. |
| Introducing a separate shared DB-types package for apps | Rejected because it weakens separation and leaks schema details. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| App direct DB runtime violations | Present in documented critical files | `0` | Eliminated in target architecture direction |
| App type imports from DB internals | Multiple files across apps | `0` imports of DB internals in apps | Enforced direction and migration path documented |
| Boundary enforcement | Convention-heavy and inconsistent | Automated validation/lint rule backed | Integrated into project checks and guidance |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Keep DB access exclusively server-side | Allow app-level type-only exceptions, shared DB type exports, strict separation | Prevents schema leakage and centralizes auth/data policies | Requires explicit API-type maintenance |
| Apps consume API contracts, not DB structure | Re-export DB schema types through RPC types, app-local schema imports | Preserves abstraction boundary and reduces coupling | Slightly more upfront API contract definition work |
| Enforce with tooling, not convention alone | Doc-only guidance, periodic manual review, automated checks | Improves long-term reliability and prevents silent regressions | Requires maintaining validation rules over time |

### 5.1 Final Architecture

Apps use `@hominem/hono-client` and API contract types from RPC layers. Server-side API/services own all database interactions and schema knowledge. Boundary enforcement is automated by checks integrated into regular quality workflows.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Boundary correction | Corrected strategy to avoid DB type re-export leakage into apps | API Architecture | `done` |
| Migration framework | Defined runtime and type-import migration patterns for apps | Apps + Platform | `done` |
| Preventive controls | Added validation/documentation guardrails for ongoing enforcement | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `docs/plans/archive/2026-02-03-enforce-db-rpc-separation.md` | `removed` | Superseded by this canonical merged record |
| `openspec/merged/2026-03-10-enforce-db-rpc-separation.md` | `added` | Canonical merged artifact |
| DB/RPC boundary policy | `updated` | Clarified and standardized for apps vs API layers |
| Validation workflow | `updated` | Boundary checks included in routine safety commands |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Convert archived architecture plan into canonical merged record |
| Ordering | Preserve corrected architecture decision, retire superseded source plan |
| Safety Controls | Docs/index update only for this task |
| Rollback | Recover removed source plan via git history |
| Residual Risk | Legacy examples in non-canonical docs may still mention old import patterns |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Source audit | Reviewed plan including critical correction and phased enforcement model | `pass` | `docs/plans/archive/2026-02-03-enforce-db-rpc-separation.md` |
| History audit | Verified source provenance commit | `pass` | `99a0856b` |
| Merged index synchronization | Added row and sorted index alignment | `pass` | `openspec/merged/README.md` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Some app docs/examples may still reference DB types directly | Low | Run targeted docs sweep as follow-up |
| Enforcement quality depends on keeping validator rules up to date | Medium | Add ownership and periodic rule review cadence |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Not applicable for merge-doc migration |
| Dependencies | RPC type contracts and boundary validation tooling |
| Monitoring | Track boundary violations via `bun run validate-db-imports` / `bun run check` |
| Incident Response | Block offending imports and patch at RPC boundary |
| Rollback Trigger | Regression in import-boundary checks or app build reliability |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `positive` | Boundary model centralizes sensitive access paths |
| Data handling impact | `positive` | Reduces accidental direct DB coupling in app code |
| Secrets/config changes | `no` | No new secrets introduced |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| “Type-only” exceptions can still break architecture boundaries | Treat type imports as architectural dependencies, not harmless shortcuts |
| Early architecture corrections prevent long-term drift | Require explicit architecture review checkpoints for boundary changes |
| Tooling-backed constraints are more durable than conventions | Keep boundary validators in default CI and local safety checks |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Add periodic report of boundary-rule violations (new/remaining) to engineering health dashboard | `Platform` | `P1` | `2026-03-21` | `open` |
| `F-002` | Update app onboarding docs with explicit “API contracts only” type-import examples | `Apps` | `P2` | `2026-03-28` | `open` |
