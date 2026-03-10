# API Client Architecture Refactor

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `refactor-api-client-architecture-plan` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Frontend Platform` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `Historical refactor carried across app client layers` |
| Commit Range | `Directory and loader refactors delivered before final close-out reconciliation` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | App code exposed transport implementation details through `lib/hono` and older RPC path names, and finance relied too heavily on client-only loading for initial renders. |
| Outcome | Apps now use `lib/api/*` and `lib/api.server.ts`, and the current finance route surface uses server-side client loading for key data screens. |
| Business/User Impact | Cleaner app architecture, fewer transport-specific names in app code, and better initial render behavior on finance routes. |
| Delivery Shape | `Phased refactor` |

This plan renamed the app-facing API client architecture so it described the product boundary instead of the transport implementation. It also pushed finance toward the same server-loading patterns already used elsewhere in the repo.

The old plan’s route inventory is now partially stale because the app surface evolved while the refactor landed. The important outcome is already visible in the current codebase: `lib/api` is the common pattern, `lib/api.server.ts` exists in the web apps, and key finance routes import `createServerHonoClient` for server-side fetching. That is the real completion condition, so the plan is being merged by current-code evidence.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| App naming cleanup | Standardized app client directories around `lib/api` and `lib/api.server.ts` |
| Notes/Rocco/Finance alignment | Brought the major web apps onto the same client/server API access naming pattern |
| Finance server loading | Confirmed server-side loading exists on the current finance route set where needed |
| Documentation cleanup | Retired the stale refactor plan in favor of this merged record |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Preserving the exact route list from the original plan | The app surface changed after the plan was written |
| Reintroducing `lib/hono` or `lib/rpc/server` for historical symmetry | The point of the refactor was to remove those names from app architecture |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| App API naming | `lib/hono` and `lib/rpc/server` variants | `lib/api` and `lib/api.server.ts` | Standardized in current web apps |
| Finance initial loading strategy | Heavy client-only fetching | Server-side loaders on active data routes | Present on current finance route surface |
| App architecture consistency | Mixed patterns by app | One shared mental model | Rocco, Notes, and Finance all use the `api` naming path |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Rename client architecture to `api` | Keep `hono`, use `rpc`, or use `api` | `api` describes the boundary without leaking transport details | Internally the client still speaks Hono/RPC contracts |
| Flatten server client entrypoint to `api.server.ts` | Nested `rpc/server.ts`, app-specific variants, or flattened file | Makes route imports simpler and consistent | Requires coordinated import updates |
| Evaluate completion against the current route surface | Force the old route list literally, or reconcile to present code | Better reflects shipped behavior and avoids stale checklist debt | The merged record must explain why the original route list changed |

### 5.1 Final Architecture

Each web app uses `lib/api` for browser-facing client utilities and `lib/api.server.ts` for server-side Hono client construction. Route modules import the server client directly where SSR or server-side loading is required. The app layer no longer advertises transport details through path names like `hono` or older `rpc/server` conventions.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Directory rename | Moved app-facing client architecture to `lib/api` naming | Frontend Platform | `done` |
| Server client flattening | Standardized `api.server.ts` entrypoints | Frontend Platform | `done` |
| Finance loader adoption | Added/retained server-side loading on the current active finance route set | Frontend Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `apps/finance/app/lib/api.server.ts` | `retained` | Canonical finance server client |
| `apps/finance/app/lib/api/*` | `retained` | Finance client architecture uses `api` naming |
| `apps/notes/app/lib/api.server.ts` | `retained` | Canonical notes server client |
| `apps/notes/app/lib/api/*` | `retained` | Notes client architecture uses `api` naming |
| `apps/rocco/app/lib/api.server.ts` | `retained` | Canonical rocco server client |
| `apps/rocco/app/lib/api/*` | `retained` | Rocco client architecture uses `api` naming |
| `docs/plans/2026-02-15-refactor-api-client-architecture-plan.md` | `removed` | Replaced by merged doc |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | App-layer architectural refactor only; no DB migration |
| Ordering | Rename and import cleanup first, server-loading alignment second |
| Safety Controls | Keep transport contract unchanged while renaming app-side file structure |
| Rollback | Revert app client path changes if an import or loader regression appears |
| Residual Risk | Some comments or older docs may still refer to historical `hono` naming |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| App structure inspection | Verified `lib/api` and `api.server.ts` exist in the web apps | `pass` | Current `apps/finance`, `apps/notes`, and `apps/rocco` paths |
| Finance route inspection | Verified active finance routes import `createServerHonoClient` | `pass` | `apps/finance/app/routes/finance.tsx`, `accounts.tsx`, `accounts.$id.tsx`, `analytics.monthly.$month.tsx` |
| Historical naming check | Verified no current app `lib/hono` or `lib/rpc/server` directories remain in the inspected app surface | `pass` | Current app directory listing |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| The original plan’s exact list of finance routes no longer maps 1:1 to the current app surface | Low | Evaluate completion against the current route tree, not the historical draft |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard app deploy |
| Dependencies | Hono client contracts, SSR route loaders, auth guards |
| Monitoring | Watch SSR route failures and initial page data regressions |
| Incident Response | Revert the affected route or import path if server loading regresses |
| Rollback Trigger | Broken imports, missing data on initial render, or SSR auth issues |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | Server loaders continue to rely on auth guards |
| Data handling impact | `ok` | Refactor only changes client architecture shape, not backend authorization rules |
| Secrets/config changes | `no` | None introduced here |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| App path names should describe boundaries, not implementation details | Prefer product-language architecture names like `api` over transport-specific labels |
| Route inventories in long-lived plans go stale quickly | Reconcile completion against the real route tree before merging |
| Server-loading adoption is easiest when apps share one server-client entrypoint pattern | Keep `api.server.ts` as the default convention for SSR routes |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Sweep stale comments or docs that still mention old `lib/hono` naming in app-layer guidance | `Frontend Platform` | `P2` | `2026-03-31` | `open` |
