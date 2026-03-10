# Unify Error Handling Across RPC and API Layers

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | fix-unify-error-handling |
| Merge Date | 2026-02-15 |
| Status | Completed |
| Tech Lead | Platform |
| Team | API + RPC |
| Primary Repo | hackefeller/hominem |
| PR(s) | See commits listed in source plan |
| Commit Range | Includes `34f72537`, `1f846f39`, `6052d489`, `bb37d911` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | `services/api` lacked global error middleware and error behavior was inconsistent across API surfaces. |
| Outcome | Added global error handling, activated Sentry pathing, audited route behavior, and standardized logging in key paths. |
| Business/User Impact | Clients receive proper HTTP error semantics and backend error observability is improved. |
| Delivery Shape | Multi-phase reliability hardening across middleware, routes, and dev ergonomics. |

This project closed the gap between RPC-layer error handling and services API behavior. The final state provides consistent status-code based failure responses and centralized handling for service errors, with fallback protection for unexpected exceptions.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Global API error handling | Registered `app.onError` in `services/api` |
| Error telemetry wiring | Activated Sentry initialization/middleware path with safe config checks |
| Route audit | Verified/normalized route error responses |
| Logging consistency | Replaced key console usage with structured logger |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Full platform-wide exception taxonomy redesign | Not required for immediate HTTP semantics fix |
| Non-API client UX changes | Backend-focused reliability work |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| services/api global error middleware | Missing | Present for all API routes | Achieved |
| HTTP status behavior on failures | Inconsistent in some paths | Proper 4xx/5xx responses | Achieved |
| Error tracking integration | Defined but not fully activated | Active when configured | Achieved |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Use global `app.onError` in services/api | Per-route handling only vs centralized | Ensures consistent fallback and status behavior | Requires careful error-shape conventions |
| Preserve ServiceError mapping pattern | Ad-hoc JSON error payloads vs typed mapping | Keeps predictable API contracts and status mapping | Requires disciplined throwing patterns |
| Guard Sentry init on config | Always-on init vs conditional init | Safer local/dev behavior and fewer startup failures | Telemetry absent when DSN missing |

### 5.1 Final Architecture

`services/api` now has a central error interception layer that logs, maps known service errors to typed responses/status codes, and returns a generic 500 fallback for unexpected failures. RPC and API layers now align on status-code-first failure semantics.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Error middleware | Added global handler to API server | Platform | done |
| Telemetry | Integrated safe Sentry initialization/middleware | Platform | done |
| Route validation | Audited and verified proper route error patterns | Platform | done |
| Logging support | Structured logger updates in key paths | Platform | done |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `services/api/src/server.ts` | updated | `app.onError`, structured logging, middleware registration |
| `services/api/src/lib/sentry.ts` | updated | Safer init path and middleware wiring |
| `services/api/src/routes/*` | audited/updated | Verified error throwing/status behavior |
| `packages/hono-rpc/src/middleware/error.ts` | updated | Logging and consistency improvements |
| `services/api/package.json` | updated | Dev port cleanup for reliability |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Application-layer error handling migration; no DB schema migration |
| Ordering | Middleware first -> telemetry wiring -> route audit -> logging polish |
| Safety Controls | Type-safe ServiceError checks and fallback 500 responses |
| Rollback | Revert middleware/telemetry commits |
| Residual Risk | Routes that return raw errors without ServiceError discipline |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Functional | Error response status/path behavior checks | pass | Source plan acceptance criteria |
| Static | TypeScript/lint/tests | pass | Source plan status |
| Operational | Sentry activation path with config guard | pass | `sentry.ts` update notes |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Sentry verification depends on production DSN presence | Medium | Add staging verification checklist |
| Some console usage remained in non-critical contexts | Low | Track separately under logging plan |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Deploy middleware and route updates together |
| Dependencies | `@hominem/services`, logger package, Sentry config |
| Monitoring | API 4xx/5xx rates, unhandled exception logs, Sentry ingestion |
| Incident Response | Revert error middleware changes if widespread response regressions occur |
| Rollback Trigger | Incorrect status mapping, broken API responses, telemetry startup failures |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | ok | No auth model changes |
| Data handling impact | ok | Error payloads standardized and bounded |
| Secrets/config changes | yes | Sentry DSN/config behavior explicitly handled |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Centralized error middleware prevents drift across route implementations | Make global error handler mandatory in service bootstrap templates |
| Telemetry hooks need explicit environment guards | Keep safe-init pattern as standard |
| Status-code correctness is a contract, not an implementation detail | Add regression tests focused on error semantics |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| F-001 | Add dedicated integration tests for standardized error response shapes | Platform | P1 | 2026-03-25 | open |
| F-002 | Validate Sentry capture path in staging with synthetic errors | Platform | P1 | 2026-03-20 | open |
