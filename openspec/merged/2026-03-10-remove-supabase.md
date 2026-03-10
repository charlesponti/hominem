# Remove Supabase and Migrate to Cloudflare R2

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `remove-supabase` |
| Merge Date | `2026-03-10` |
| Status | `Completed (retrospective merge from plan artifacts)` |
| Tech Lead | `Platform` |
| Team | `Platform + API + Workers + Apps` |
| Primary Repo | `hackefeller/hominem` |
| Source Artifacts | `docs/plans/remove-supabase/proposal.md`, `docs/plans/remove-supabase/design.md`, `docs/plans/remove-supabase/tasks.md` |
| Evidence Commits | `52e077e3`, `2ac6d21f`, `d03ff7a4`, `bbb9b1b5` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Supabase-specific storage dependencies and references remained after broader architecture changes, creating dead dependencies and inconsistent storage patterns. |
| Outcome | Storage moved to Cloudflare R2 through an S3-compatible implementation in `@hominem/utils/storage`, Supabase package dependencies were removed, and consumers were migrated to the new module. |
| Business/User Impact | Lower dependency surface, cleaner architecture boundaries, and unified storage behavior across API/workers/apps. |
| Delivery Shape | `Phased migration with compatibility-preserving interface` |

The original plan targeted full removal of Supabase storage usage and replacement with R2 while minimizing disruption by preserving storage method contracts. Delivery evidence in code and environment schemas matches that intended direction.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Storage provider migration | Replace Supabase SDK-based storage path with Cloudflare R2 (`@aws-sdk/client-s3`) implementation. |
| Dependency cleanup | Remove direct `@supabase/*` package dependencies from workspace manifests. |
| Consumer migration | Update API, workers, and app routes/services to import `@hominem/utils/storage`. |
| Env model update | Move required storage configuration to `R2_*` variables in server/worker/app env schemas. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| DB column retirement (`supabase_id`) migration | Explicitly deferred to dedicated schema/migration workstream. |
| Historical documentation cleanup outside this plan | Non-blocking references retained for historical context unless actively misleading. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Supabase package dependencies | Present in storage utility package | `0` direct `@supabase/*` dependencies | Achieved (`rg "@supabase/" --glob '**/package.json'` returned no matches) |
| Storage module path | `@hominem/utils/supabase` | `@hominem/utils/storage` | Achieved across key API/worker/app consumers |
| Runtime storage credentials | Supabase env vars | R2 env vars (`R2_ENDPOINT`, key/secret, bucket) | Achieved in API and workers env schemas |
| Interface compatibility | Risk of breaking call sites | Preserve core method contracts | Achieved by `R2StorageService` with existing operation coverage |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Use R2 via S3 API | Native Supabase SDK, custom HTTP adapter, S3-compatible client | Minimizes custom protocol code and leverages stable AWS SDK tooling | Requires explicit credential and endpoint configuration |
| Keep storage interface aligned with previous usage | Break interface and force consumer rewrites, compatibility layer | Reduced migration risk and enabled incremental adoption | Carries some legacy method semantics forward |
| Defer DB field removal | Remove `supabase_id` immediately, defer to separate change | Avoids mixing schema migration risk with storage-provider migration | Leaves historical schema artifact temporarily |

### 5.1 Final Architecture

Storage responsibilities are centralized under `@hominem/utils/storage` with `R2StorageService` using S3 commands for upload/download/delete/list/signed URL operations. API routes, workers, and app endpoints consume this module directly while environment validation enforces required R2 configuration.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Utility package migration | Added `packages/utils/src/storage` and exported R2 service + types | Platform | `done` |
| Dependency surface cleanup | Removed Supabase package dependencies and added AWS SDK deps in utils | Platform | `done` |
| Consumer updates | Migrated imports in finance import route, workers, notes upload/speech, hono-rpc files/vector, places images | API + Workers + Apps | `done` |
| Env configuration updates | Added `R2_*` env schema fields and test setup defaults where needed | API + Workers + Apps | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/utils/src/storage/r2-storage.ts` | `added/updated` | Primary R2-backed storage implementation |
| `packages/utils/src/storage/index.ts` | `added` | Storage exports surface |
| `packages/utils/package.json` | `updated` | Supabase deps removed, AWS SDK deps present |
| `services/api/src/routes/finance/finance.import.ts` | `updated` | Uses `@hominem/utils/storage` |
| `services/workers/src/transaction-import-worker.ts` | `updated` | Uses `@hominem/utils/storage` |
| `apps/notes/app/routes/api.upload.ts` | `updated` | Uses `@hominem/utils/storage` |
| `apps/notes/app/routes/api.speech.ts` | `updated` | Uses `@hominem/utils/storage` |
| `packages/hono-rpc/src/routes/files.ts` | `updated` | Uses `@hominem/utils/storage` |
| `packages/hono-rpc/src/routes/vector.ts` | `updated` | Uses `@hominem/utils/storage` |
| `packages/places/src/place-images.service.ts` | `updated` | Uses `@hominem/utils/storage` |
| `services/api/src/env.ts` | `updated` | R2 env keys validated |
| `services/workers/src/env.ts` | `updated` | R2 env keys validated |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Replace provider implementation behind existing storage abstraction and migrate imports to new module path |
| Ordering | Dependencies and storage service first, consumer imports second, env and tests third |
| Safety Controls | Preserve method signatures and behavior where practical; retain test mocks for storage callers |
| Rollback | Revert to pre-migration commit set and restore old module/dependencies if required |
| Residual Risk | Non-runtime references to `supabase` remain in historical docs and one utility URL helper case |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Artifact audit | Reviewed proposal/design/tasks and reconciled with codebase state | `pass` | `docs/plans/remove-supabase/*` |
| Dependency audit | Verified no direct `@supabase/*` dependencies in package manifests | `pass` | `rg "@supabase/" --glob '**/package.json'` (no matches) |
| Import/env audit | Verified active storage imports and `R2_*` env schema usage across API/workers/apps | `pass` | `rg` evidence in services/apps/packages |
| Provenance audit | Confirmed plan and implementation commit lineage | `pass` | `52e077e3`, `2ac6d21f`, `d03ff7a4`, `bbb9b1b5` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| `packages/utils/src/images.ts` still includes `supabase.co` URL handling logic for variant rewrite | Low | Keep for backward URL compatibility; revisit in image URL normalization cleanup |
| Historical docs still mention `supabase_id` | Low | Address under schema/documentation modernization work |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard deploy with validated `R2_*` secrets in runtime environments |
| Dependencies | Cloudflare R2 endpoint and credentials |
| Monitoring | Track upload/download error rates in API/workers and signed URL failures |
| Incident Response | Fallback to previous release if storage operations regress |
| Rollback Trigger | Elevated storage operation failures or credential/permission mismatches |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `none` | No auth model change in this merge action |
| Data handling impact | `limited` | Storage provider changed, data access path remains controlled server-side |
| Secrets/config changes | `yes` | Uses `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Provider migration is safer when interface compatibility is preserved | Keep storage abstractions stable and swap implementation beneath them |
| Env schema parity across services/apps prevents drift | Continue shared env validation and synchronization tooling |
| Plan docs should include explicit closure status of each task item | Add completion snapshots in future migration plans before archival |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Remove or rename remaining `supabase` terminology in non-runtime docs/util helpers where safe | `Platform` | `P2` | `2026-03-24` | `open` |
| `F-002` | Evaluate and schedule explicit schema removal for legacy `supabase_id` references if still present | `DB` | `P2` | `2026-03-31` | `open` |
