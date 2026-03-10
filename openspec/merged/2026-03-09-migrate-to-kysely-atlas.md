# Migrate Database Layer to Kysely + Atlas

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `migrate-to-kysely-atlas` |
| Merge Date | `2026-03-09` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform + API` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `N/A (historical merge chain)` |
| Commit Range | `Tracked in repo history for this change window` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Drizzle-based DB layer produced high type overhead and slower developer iteration, and migration ergonomics were difficult for branch-heavy work. |
| Outcome | Query layer moved to Kysely with direct route-aligned data access, Drizzle stack removed, and schema management standardized for the migration phase. |
| Business/User Impact | Faster backend iteration, clearer DB query ownership, and reduced operational friction for schema evolution work. |
| Delivery Shape | Big-bang migration for data access layer with staged verification gates. |

The project replaced the prior Drizzle-centered implementation with a Kysely-first approach while preserving API contract behavior. The migration targeted developer velocity and maintainability, especially for large type surfaces and route-level query evolution.

Work was executed as a concentrated migration effort across DB package internals and API route handlers. The team prioritized compatibility at RPC boundaries and minimized user-visible behavior changes during rollout.

At completion, the old Drizzle dependencies and service abstractions were removed from the active code path. Verification gates (build/typecheck/lint/tests) were used as quality control checkpoints throughout implementation.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| `packages/db` | Introduced/standardized Kysely DB runtime and generated types as primary DB access path. |
| `services/api` and RPC route implementations | Migrated domain query logic from Drizzle service calls to Kysely query execution. |
| Dependency graph | Removed Drizzle runtime/tooling dependencies from active stack. |
| Migration workflow (during project phase) | Standardized SQL/schema representation and migration handling for the cutover period. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Client-side RPC API contracts | Explicitly held stable to avoid downstream app breakage. |
| Multi-database engine support | Project goal was PostgreSQL-focused migration reliability, not engine abstraction. |
| Broad frontend architecture changes | Not required for DB layer migration objective. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| DB query stack | Drizzle services + schema artifacts | Kysely-first query stack | Completed |
| Dependency posture | Drizzle runtime/tooling present | Remove Drizzle dependencies | Completed |
| RPC compatibility | Existing route contracts | No contract break | Completed (per migration verification) |
| Type-check ergonomics | Higher complexity in DB layer typing | Simpler linear query typing model | Improved via Kysely migration |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Move query layer to Kysely | Keep Drizzle, hybrid Drizzle+Kysely, full Kysely | Kysely provided clearer SQL ergonomics and reduced type-layer friction for this codebase pattern | Required broad coordinated refactor across domains |
| Keep RPC contracts stable | Contract changes vs internal-only refactor | Reduced blast radius and preserved consumer compatibility | Required careful parity mapping in route handlers |
| Remove service abstraction in many paths | Keep service layer vs route-localized query logic | Improved locality and reduced indirection for route-owned workflows | Some teams prefer service indirection for reuse |
| Big-bang cutover | Incremental domain-by-domain dual-run | Faster completion with clear end-state and no long-lived dual stack | Higher coordination risk during migration window |

### 5.1 Final Architecture

The final shape centers on Kysely as the primary query interface for backend data access. Query logic is colocated closer to API route execution boundaries, with `packages/db` providing shared database runtime/types. RPC contracts remain the durable public boundary, while internals now use Kysely-native query construction and typing.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| DB runtime migration | Established Kysely-based DB runtime/types as canonical implementation path | Platform | done |
| Domain query migration | Rewrote route/service query logic across domains to Kysely | API + Platform | done |
| Dependency cleanup | Removed Drizzle dependencies and obsolete code paths | Platform | done |
| Verification and hardening | Ran build/typecheck/lint/tests and addressed migration-level type issues | Platform | done |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/db/*` | updated | Core DB access internals migrated to Kysely-first architecture |
| `packages/db/src/schema/*` (legacy) | removed | Drizzle schema source files removed from active stack |
| `packages/db/src/migrations/*` (legacy drizzle flow) | removed | Legacy migration artifacts retired during cutover |
| `services/api/src/routes/*` | updated | Query implementations migrated to Kysely while preserving RPC behavior |
| Domain packages using DB services | updated | Migration parity and typing adjustments completed |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Big-bang query/runtime migration with explicit schema representation for migration phase |
| Ordering | Establish runtime/types first, migrate domain queries, remove legacy dependencies/code last |
| Safety Controls | Contract stability constraints, staged verification, repeatable CI checks |
| Rollback | Revert as a coordinated code+dependency rollback set, not partial path rollback |
| Residual Risk | Long-tail type-cast cleanup in non-critical paths and migration-doc consistency updates |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Local | build, typecheck, lint, test gates during migration completion | pass (with known pre-existing unrelated caveats logged during effort) | Migration task/progress artifacts |
| CI | Standard project workflows for code quality and migration checks | pass for migration completion path | Repository workflow history |
| Smoke | Core route-level DB behaviors under stable RPC contracts | pass | Domain migration completion status |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Remaining low-priority cast cleanup in some route files | Maintainability/readability debt | Track as follow-up with owner and due date |
| Historical docs drift after workflow changes | Onboarding/confusion risk | Use merged-doc standard and update migration docs in follow-up |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Deploy with contract stability preserved; monitor DB-backed routes after release |
| Dependencies | PostgreSQL runtime behavior, CI environment parity, migration tooling consistency |
| Monitoring | API error rates, DB query failures, auth/session route behavior, migration job outcomes |
| Incident Response | Roll back coordinated migration commit range if severe regressions are detected |
| Rollback Trigger | Elevated DB/API error rate, contract behavior regressions, or blocked migration execution |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | ok | No intentional auth model change; contract behavior maintained |
| Data handling impact | ok | No user-facing data model break intended during migration |
| Secrets/config changes | yes | Migration/runtime configuration paths evolved as part of DB tooling changes |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Big-bang infra migrations need explicit adoption/compatibility safeguards in deploy jobs | Bake one-time adoption logic and idempotency checks into deploy workflows earlier |
| Contract-stable internal refactors reduce rollout risk materially | Keep contract freeze as a default pattern for deep infrastructure migrations |
| Merge docs are more useful when table-first and evidence-oriented | Standardize post-merge template and require completion at archive time |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Remove remaining low-priority cast cleanup items in route files | Platform | P2 | 2026-03-31 | open |
| `F-002` | Align migration documentation with current Goose-based workflow state | Platform | P1 | 2026-03-15 | in-progress |
| `F-003` | Apply merged-doc conversion to additional archived changes | Platform | P2 | 2026-03-22 | open |
