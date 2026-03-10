# Replace Console Logging with Structured Logger

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | fix-structured-logging |
| Merge Date | 2026-02-15 |
| Status | Completed |
| Tech Lead | Platform |
| Team | API + RPC |
| Primary Repo | hackefeller/hominem |
| PR(s) | See commits listed in source plan |
| Commit Range | Includes `1f846f39`, `bb37d911`, `8297f9d3`, `f35a2fa5` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Server-side paths still used ad-hoc `console.*` despite existing structured logger. |
| Outcome | Replaced targeted server-side console logging with `@hominem/utils/logger`. |
| Business/User Impact | Better production observability and consistent log formatting/severity. |
| Delivery Shape | Cross-cutting refactor over API and RPC route/middleware files. |

The completed work standardized logging in critical backend paths while intentionally leaving appropriate contexts (client hooks, startup one-offs, scripts) on plain console usage. This improved signal quality for aggregation and incident triage without broad behavioral changes.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| API server and middleware | Replaced key `console.*` calls with structured logger |
| RPC middleware and routes | Replaced route-level console usage |
| Logging conventions | Applied level guidance and structured metadata pattern |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Browser/client logging | Console remains appropriate in client runtime |
| One-off scripts | Kept simple console behavior |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Server-side ad-hoc console usage | High in critical paths | Structured logger in priority paths | Achieved |
| Log consistency | Mixed formats | Uniform structured events | Achieved |
| Build/type safety | Must remain stable | No regressions | Achieved |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Use existing shared logger package | Introduce new logger vs reuse | Reuse avoids fragmentation and leverages existing redaction/settings | Requires broad touchpoints |
| Keep some console usage | Replace 100% vs context-aware replacement | Practical and appropriate for client/scripts/startup contexts | Mixed patterns remain by intent |

### 5.1 Final Architecture

Backend services and RPC paths log through shared structured logger instances, with metadata payloads for error context. Logging behavior is centrally aligned while preserving context-specific exceptions.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Core middleware/server logging | Updated high-priority files | Platform | done |
| Route-level migration | Updated API and RPC routes | Platform | done |
| Policy alignment | Documented acceptable console exceptions | Platform | done |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `services/api/src/server.ts` | updated | Structured error/event logging |
| `packages/hono-rpc/src/middleware/error.ts` | updated | Structured middleware logging |
| `packages/hono-rpc/src/routes/*.ts` | updated | Route-level replacement sweep |
| `services/api/src/routes/*.ts` | updated | Route-level replacement sweep |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Code refactor only; no schema/data migration |
| Ordering | High-priority files first, then route sweep |
| Safety Controls | Typecheck/lint/tests and selective scope |
| Rollback | Revert logging refactor commits |
| Residual Risk | Inconsistent patterns may reappear without lint enforcement |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Static checks | TypeScript + lint + tests | pass | Source plan acceptance checklist |
| Functional | Error/reporting paths in API/RPC | pass | Completed status and commit history |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| No explicit lint rule preventing new server `console.*` | Medium | Add lint rule or codemod check |
| Intentional exceptions can expand over time | Low | Keep documented exception policy |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard deployment; no special migration sequencing |
| Dependencies | Shared logger package availability |
| Monitoring | Log ingestion rate, error event quality, field structure |
| Incident Response | Revert refactor if logging breaks critical paths |
| Rollback Trigger | Missing logs, malformed payloads, or perf regression |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | ok | No auth behavior changes |
| Data handling impact | ok | Logger already supports sensitive field redaction |
| Secrets/config changes | no | No new secret requirements |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Shared logging utilities reduce observability drift | Enforce shared logger in backend coding guidelines |
| Full replacement is not always necessary | Keep explicit “allowed console” policy |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| F-001 | Add lint guard for server-side `console.*` in critical paths | Platform | P1 | 2026-03-31 | open |
| F-002 | Add periodic log schema audits in CI | Platform | P2 | 2026-04-15 | open |
