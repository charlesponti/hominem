# Unified Environment Package

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `feat-unified-environment-package-plan` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform + App Infra` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `Historical multi-commit effort with later repository-wide adoption` |
| Commit Range | `Includes package creation, app adoption, and final close-out reconciliation` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Apps and services had duplicated env parsing logic, mixed access patterns, and inconsistent client/server boundaries. |
| Outcome | `@hominem/env` is now the shared environment package, and app/service env entrypoints use `createClientEnv()` and `createServerEnv()` consistently. |
| Business/User Impact | Safer env access, cleaner SSR behavior, and lower maintenance cost across apps and services. |
| Delivery Shape | `Phased` |

This project introduced a dedicated env package to unify validation and access patterns across web apps and services. The original plan included both the core package work and a set of optional “tooling and polish” items that remained listed as pending long after the functional migration had already landed.

The codebase today shows the real outcome clearly: the package exists, the factory API shape is stable, apps own their own schemas, and server-side packages use the same utility layer. The remaining Phase 4 items from the old plan were optional hardening ideas rather than blockers to adoption, so this close-out records the work as complete and retires the stale plan.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Shared env package | Keep `@hominem/env` as the canonical env utility package |
| App adoption | Confirm `apps/finance`, `apps/notes`, and `apps/rocco` all use local schema definitions with `createClientEnv()` / `createServerEnv()` |
| Service adoption | Confirm service-side env entrypoints use the same factory approach |
| Documentation close-out | Retire the old plan now that the migration is already complete in code |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| New lint or tree-shaking enforcement that was only proposed as optional polish | Useful future hardening, but not required to declare the migration complete |
| Rewriting every remaining historical `process.env` call in the entire repo | The plan’s scope was the unified env package and its main consumers |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Shared env package | None | One canonical package | `packages/env` |
| App env implementation | Duplicated, app-local proxy logic | Factory-based shared utilities | `apps/finance`, `apps/notes`, and `apps/rocco` all use `@hominem/env` |
| Service env access | Mixed patterns | Shared server env utility | `services/api` and `packages/hono-rpc` use `createServerEnv()` |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Keep only `createClientEnv()` and `createServerEnv()` in the package | Hardcoded shared schemas, mixed exports, or factories only | Lets each app own its schema while reusing validation and lazy access behavior | Slightly more local schema duplication by design |
| Let apps define their own Zod schemas | Central base schema package, inheritance, or app-owned schemas | Keeps app env ownership explicit and avoids over-coupling | Shared variable conventions must be documented instead of implied |
| Close optional tooling items as non-blocking | Keep plan open until every polish item lands, or merge based on actual adoption | Prevents a successful infrastructure migration from being held hostage by optional lint ideas | Some hardening remains future work rather than part of this record |

### 5.1 Final Architecture

`@hominem/env` provides the env access factories. Each app defines its own client/server schemas in `app/lib/env.ts`, while service-side packages define server-only schemas near their runtime entrypoints. Validation is lazy and boundary-aware, which avoids SSR pitfalls and keeps env ownership close to the consumer.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Package foundation | Added the env package with client/server factory helpers and tests | Platform | `done` |
| App migration | Migrated finance, notes, and rocco env access to the shared package | Platform | `done` |
| Service migration | Standardized service env access on the same utility pattern | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/env/src/create-client-env.ts` | `retained` | Shared client env factory |
| `packages/env/src/create-server-env.ts` | `retained` | Shared server env factory |
| `packages/env/src/index.ts` | `retained` | Factory-only export surface |
| `apps/finance/app/lib/env.ts` | `retained` | App-owned schema using shared factories |
| `apps/notes/app/lib/env.ts` | `retained` | App-owned schema using shared factories |
| `apps/rocco/app/lib/env.ts` | `retained` | App-owned schema using shared factories |
| `services/api/src/env.ts` | `retained` | Service env entrypoint using shared server factory |
| `packages/hono-rpc/src/lib/env.ts` | `retained` | Package env entrypoint using shared server factory |
| `docs/plans/2026-02-15-feat-unified-environment-package-plan.md` | `removed` | Replaced by merged doc |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Incremental code migration; no DB changes |
| Ordering | Package foundation first, app adoption second, service cleanup after |
| Safety Controls | Lazy validation, explicit client/server boundary helpers |
| Rollback | Revert env entrypoint changes package-by-package if needed |
| Residual Risk | Optional enforcement items like lint guards are still future hardening opportunities |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Repository inspection | Verified `@hominem/env` package exists with factory entrypoints | `pass` | `packages/env/src/create-client-env.ts`, `packages/env/src/create-server-env.ts` |
| App inspection | Verified main web apps import from `@hominem/env` in their local env files | `pass` | `apps/finance/app/lib/env.ts`, `apps/notes/app/lib/env.ts`, `apps/rocco/app/lib/env.ts` |
| Service inspection | Verified service-side env entrypoints use the shared factory approach | `pass` | `services/api/src/env.ts`, `packages/hono-rpc/src/lib/env.ts` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Proposed Oxlint rule for env access did not ship as part of this effort | Low | Handle as future repo-hardening work if the team still wants it |
| Proposed tree-shaking-specific CI guard did not ship as part of this effort | Low | Add only if bundle or leakage regressions show up later |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard deploy; no special ordering |
| Dependencies | Zod, app/service env variables, SSR runtime |
| Monitoring | Watch env validation failures during boot and route execution |
| Incident Response | Revert the affected env entrypoint if an app/service schema regresses |
| Rollback Trigger | Incorrect validation behavior or runtime access in the wrong context |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | No auth model change |
| Data handling impact | `ok` | Safer env boundary separation only |
| Secrets/config changes | `no` | Uses existing environment variables with improved access patterns |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Shared factories are more reusable than shared env schemas | Keep ownership of env schemas at the app/service boundary |
| Optional polish items should not keep a shipped infra change “open” forever | Separate must-have migration work from future hardening |
| Lazy validation is the right SSR default for mixed client/server stacks | Reuse this pattern for future cross-runtime utilities |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Decide whether env-access linting should become a repo-wide rule | `Platform` | `P2` | `2026-03-31` | `open` |
