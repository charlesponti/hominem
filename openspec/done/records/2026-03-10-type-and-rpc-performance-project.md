# Type & RPC Performance Project

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `type-and-rpc-performance-project` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform + API` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `Historical multi-commit effort; see git history around 2026-01-29 through 2026-03-10` |
| Commit Range | `Includes the original Jan/Feb implementation plus final close-out cleanup on 2026-03-10` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Type-check performance, stale RPC wrapper patterns, and blurred DB/app boundaries slowed development and increased maintenance cost. |
| Outcome | The codebase now uses faster type flows, direct JSON RPC/HTTP patterns, enforced DB/RPC separation, and cleaned-up route typing for the remaining stale edges. |
| Business/User Impact | Faster iteration, simpler route behavior, and clearer contracts reduce developer overhead and risk. |
| Delivery Shape | `Phased` |

This project started as a broad architecture program spanning type performance, route response patterns, and database boundary enforcement. Most implementation landed in January and February 2026, but the plan stayed open because several “remaining” tasks were either stale or only partially finished.

The final close-out on 2026-03-10 reconciled the plan against the actual codebase. Real remaining work was finished in route typing and Plaid error handling, while obsolete checklist items were retired because the current architecture had already moved past them.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| RPC route cleanup | Removed remaining `any`-based update payloads in key routes and aligned Plaid route error handling with current middleware pattern. |
| API guidance | Rewrote stale internal guidance away from `ApiResult` envelopes toward direct JSON success bodies and typed error middleware. |
| Plan close-out | Reclassified stale checklist items against current code truth and replaced the plan with this merged record. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Large router/package re-architecture | Perf targets were already met without the optional router split work. |
| Rewriting every remaining historical `any` in the repo | This close-out focused on the unfinished items owned by this specific project. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Full monorepo type-check | `2-3 min` | `<1s` goal tracked by plan | `~614ms` reported in project metrics |
| Packages passing typecheck | `~30/41` | `41/41` | `41/41` |
| DB imports in apps | `~17 violations` | `0` | `0` |
| Wrapper-style route boilerplate | `143 instances` | `0` or explicitly justified | Core migration complete; final stale edges closed |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Prefer direct JSON responses over `ApiResult` envelopes | Wrapper envelopes, mixed mode, direct responses | HTTP status codes already encode failure semantics and reduced wrapper complexity in real code | Some old docs/comments had to be corrected later |
| Keep DB access behind RPC/API layers | Direct app DB access, mixed access, strict separation | Prevents schema leakage and keeps auth/authorization in one place | Requires explicit API types for apps |
| Translate external provider failures into typed errors | Return raw provider errors, route-local JSON errors, typed middleware flow | Preserves consistent error behavior while keeping provider details server-side | Requires explicit boundary logging/mapping |

### 5.1 Final Architecture

Apps consume API contracts and never import database internals. Services throw typed errors. Routes return direct JSON success bodies and rely on shared middleware for failure handling. External-service boundaries log upstream failures and convert them into typed errors before responses are sent.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Plaid consistency | Updated the remaining Plaid route to stop returning ad-hoc 500 payloads and throw typed errors instead | Platform | `done` |
| Route typing cleanup | Replaced `Record<string, any>`/`any` update payloads in `tasks`, `bookmarks`, `tags`, `finance.accounts`, and `places` close-out paths | Platform | `done` |
| Canonical provider guidance | Added an explicit external-service error-handling doc and updated API instructions | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/hono-rpc/src/routes/finance.plaid.ts` | `updated` | Final Plaid route consistency fix |
| `packages/hono-rpc/src/routes/places.ts` | `updated` | Typed cleanup in visit/update/stats helpers |
| `packages/hono-rpc/src/routes/tasks.ts` | `updated` | Typed update payload |
| `packages/hono-rpc/src/routes/bookmarks.ts` | `updated` | Typed update payload |
| `packages/hono-rpc/src/routes/tags.ts` | `updated` | Typed update payload |
| `packages/hono-rpc/src/routes/finance.accounts.ts` | `updated` | Typed update payload |
| `.github/instructions/api.instructions.md` | `updated` | Replaced stale wrapper guidance |
| `docs/external-service-error-handling.md` | `added` | Canonical provider error-handling pattern |
| `docs/plans/2026-01-15-type-and-rpc-performance-project.md` | `removed` | Replaced by merged doc |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Code/documentation reconciliation only; no database migration required |
| Ordering | Finish true remaining code work, retire stale checklist items, generate merged doc |
| Safety Controls | Kept changes local to route typing and internal guidance; no contract expansion |
| Rollback | Revert the close-out patch if route typing or guidance proves incorrect |
| Residual Risk | Some unrelated historical comments elsewhere may still mention old wrapper terminology |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Static inspection | Compared remaining checklist items to current codebase | `pass` | Oldest plan reconciled against actual route and doc state |
| Route cleanup | Narrow route files updated without changing public contract shape | `pass` | `packages/hono-rpc` route edits |
| Documentation | Shared guidance updated to current direct-response pattern | `pass` | Updated API instruction doc and new provider pattern doc |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Some routes elsewhere still use `any` or old comments outside this project’s scope | Low | Address in later code-health passes rather than keeping this project open indefinitely |
| Optional router-splitting roadmap was never implemented | Low | Perf goals were already achieved, so it remains intentionally unshipped |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard deploy; no migration ordering required |
| Dependencies | Plaid, Google APIs, typed error middleware |
| Monitoring | Watch 5xx rates on provider-backed routes, especially Plaid |
| Incident Response | Revert close-out changes if provider or route responses regress |
| Rollback Trigger | Unexpected response-shape regressions or route-level type/runtime errors |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | No auth model changes |
| Data handling impact | `ok` | No DB schema or client data-handling changes |
| Secrets/config changes | `no` | Guidance added, but no new env requirements |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Architectural plans become stale quickly when implementation moves faster than documentation | Close plans with a code-truth reconciliation pass before archiving |
| Shared engineering instructions must evolve with the actual transport pattern | Treat internal guidance as production code and review it during architecture changes |
| Provider integrations need one canonical failure-handling pattern | Keep external-service error translation documented in one stable location |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Sweep other non-project route comments still mentioning `ApiResult` where behavior has moved to direct JSON responses | `Platform` | `P2` | `2026-03-24` | `open` |
