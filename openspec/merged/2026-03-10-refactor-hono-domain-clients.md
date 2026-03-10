# Refactor Hono Domain Clients

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `refactor-hono-domain-clients` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Platform + Apps` |
| Primary Repo | `hackefeller/hominem` |
| Source Artifacts | `openspec/changes/refactor-hono-domain-clients/proposal.md`, `openspec/changes/refactor-hono-domain-clients/design.md`, `openspec/changes/refactor-hono-domain-clients/tasks.md` |
| Evidence Commits | `f9afaee4` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | App hooks and loaders were importing the full raw Hono route tree through `HonoClient`, which caused `TS2589` failures and inflated editor/typecheck cost. |
| Outcome | The shared client layer now exposes domain-scoped methods for app and SSR usage, and application code no longer calls raw `client.api...` routes directly. |
| Business/User Impact | CI typechecks are stable again, app code is simpler to write, and future API changes have a narrower type fanout. |
| Delivery Shape | `Incremental` |

This change started as a places-focused pilot but expanded into a full app-facing client boundary refactor once the domain facade proved out. The work moved Hono transport details into `@hominem/hono-client`, migrated the highest-value client hooks first, and then finished the remaining SSR loaders and actions so the temporary raw route escape hatch could be removed cleanly.

The final result is a consistent `ApiClient` surface for browser hooks and server-side loaders across Rocco, Notes, Mobile, and Finance. Raw Hono route access now lives only inside domain implementations, where it is intentionally centralized.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Shared client boundary | Added a private raw client layer plus a public `ApiClient` facade with domain modules such as `places`, `lists`, `invites`, `notes`, `finance`, and `files`. |
| App hook migration | Migrated client hook code in Rocco, Notes, Mobile, and Finance off raw `HonoClient` and `client.api...` usage. |
| SSR migration | Migrated route loaders and actions to the same domain facade returned by the server client helper. |
| Validation | Re-ran focused package/app checks plus full `typegen`, `typecheck`, and `check` workflows after the migration. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Hono route redesign | The change preserved route contracts and only moved transport access behind a shared boundary. |
| Database schema or service-layer changes | The work stayed in client integration and app consumption layers. |
| Storybook or UI extraction work | Budget/UI component migration was identified as a separate change and intentionally not mixed into this archive. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Clean monorepo typecheck stability | `TS2589` failures in provider and Rocco hook hotspots | Complete without deep-instantiation failures | `bun turbo run typegen && bun run typecheck` passed |
| App-facing raw route access | Widespread `client.api...` usage across hooks and SSR loaders | Remove raw route access from app code | No `.api` access remains under `apps/` |
| Focused Rocco slice timing | `~3.22s` wall clock for `apps/rocco` check during early pilot | Improve the hotspot slice while keeping behavior stable | `~2.57s` wall clock after expanded migration |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Keep the raw Hono client private | Export raw and domain clients, or keep only a domain facade | Prevents new app code from depending on the full route tree and keeps transport details centralized | Shared client package owns more mapping code |
| Use domain-scoped clients | Flat helper functions, raw route access, or grouped domain objects | Domain objects match current hook ergonomics and reduce type fanout to the relevant capability | New endpoints require explicit domain methods |
| Unify client and SSR surfaces | Separate facades for browser and server, or a shared `ApiClient` | One contract for hooks and loaders simplifies migrations and avoids parallel abstractions | Server helper changes touched multiple route files |

### 5.1 Final Architecture

`@hominem/hono-client` now builds a private raw Hono client and wraps it in a public `ApiClient` composed of focused domain modules. React hooks consume that facade through the shared provider and context, and SSR code receives the same facade through the server client helper with forwarded auth and request headers. App code no longer depends on the raw route tree, while domain modules remain the single place where route paths, methods, and response parsing are defined.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Shared facade | Added `raw-client`, `api-client`, and domain modules for places, lists, invites, notes, chats, messages, twitter, mobile, finance, files, items, user, and admin | Platform | `done` |
| App migrations | Refactored client hooks in Rocco, Notes, Mobile, and Finance to call domain methods instead of `client.api...` | Platform | `done` |
| SSR migrations | Updated Finance, Rocco, and Notes loaders/actions to use the server-side `ApiClient` facade | Platform | `done` |
| Close-out | Removed the temporary `api` compatibility property, updated OpenSpec artifacts, and prepared the canonical spec/merged record | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/hono-client/src/core/api-client.ts` | `updated` | Public `ApiClient` facade and shared factory boundary |
| `packages/hono-client/src/core/raw-client.ts` | `updated` | Private raw Hono client creation plus forwarded server headers |
| `packages/hono-client/src/ssr/server-client.ts` | `updated` | SSR helper now returns the domain-based `ApiClient` |
| `packages/hono-client/src/domains/*.ts` | `added`/`updated` | Domain wrappers centralize route access and typed response parsing |
| `apps/rocco/app/lib/hooks/*.ts` | `updated` | Migrated places, lists, invites, items, user, admin, and related hooks |
| `apps/notes/app/**/*.ts*` | `updated` | Migrated notes/chat/twitter hooks and upload/chat route consumers |
| `apps/mobile/utils/services/**/*.ts*` | `updated` | Migrated focused Mobile hook surfaces to domain methods |
| `apps/finance/app/**/*.ts*` | `updated` | Migrated finance hooks plus SSR loaders/actions |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Pilot-first rollout starting with Rocco places, then expand through adjacent domains until the raw compatibility surface could be removed |
| Ordering | Shared facade first, client hooks next, SSR loaders/actions last, then compatibility cleanup and validation |
| Safety Controls | Preserved existing React Query cache logic in app code and avoided changing route contracts |
| Rollback | Reintroduce the temporary raw client bridge or revert the domain facade changes if a migration regresses behavior |
| Residual Risk | New API endpoints now require explicit domain wrappers before app code can consume them |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Focused typecheck | `bunx tsc -p apps/rocco/tsconfig.json --noEmit` and app-specific checks for Notes, Mobile, and Finance | `pass` | Local validation during migration and close-out |
| Full type workflow | `bun turbo run typegen && bun run typecheck` | `pass` | Final migration verification completed successfully |
| Safety check | `bun run check` | `pass` | Completed with existing repo warnings only and no new errors |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| Future domains must be wrapped intentionally instead of relying on ad hoc raw route access | Low | Add new app API usage through `@hominem/hono-client` domain modules by default |
| Existing lint warnings in unrelated areas remain | Low | Track separately; they did not block this change or indicate migration regressions |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard application deploy; no data migration or staged rollout required |
| Dependencies | `@hominem/hono-client`, `@hominem/hono-rpc`, React Query consumers, SSR route helpers |
| Monitoring | Watch typecheck stability in CI and runtime behavior for migrated hooks/loaders |
| Incident Response | Revert the affected domain wrapper or restore the raw bridge temporarily if a migrated flow regresses |
| Rollback Trigger | Typecheck instability returns or a migrated client flow shows runtime request/response mismatch |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | Server helper still forwards auth token and incoming cookie headers through the shared client boundary |
| Data handling impact | `ok` | No database access rules changed; apps still use the RPC client boundary |
| Secrets/config changes | `no` | No new environment variables or secret handling paths were introduced |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Reducing public type surface area can be more effective than local type tweaks when TypeScript performance degrades | Start with boundary design before chasing isolated inference issues |
| Pilot slices work well for proving type-performance changes, but broad cleanup may be worth finishing once the abstraction is stable | Plan explicit expansion steps so temporary compatibility layers do not linger |
| A shared client contract across browser and SSR code makes follow-on migrations much easier | Prefer one app-facing client shape unless the server has materially different needs |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Add new app API consumption through domain modules by default and reject reintroduction of raw route access in app code review | `Platform` | `P2` | `2026-03-24` | `open` |
