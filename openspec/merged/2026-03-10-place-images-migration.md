# Place Images Migration

## 1. Project Metadata

| Field | Value |
| --- | --- |
| Change Slug | `place-images-migration` |
| Merge Date | `2026-03-10` |
| Status | `Completed` |
| Tech Lead | `Platform` |
| Team | `Places + Platform` |
| Primary Repo | `hackefeller/hominem` |
| PR(s) | `Historical multi-commit effort with close-out on 2026-03-10` |
| Commit Range | `Original Jan 2026 implementation plus final backfill-command close-out on 2026-03-10` |

## 2. Executive Summary

| Item | Detail |
| --- | --- |
| Problem | Place images were still tied to Google-hosted URLs at runtime, and the original plan described an outdated Supabase storage target with no clear backfill entrypoint. |
| Outcome | Place image storage is now standardized on shared storage services, new and refreshed place photos are persisted through the place image pipeline, and a dedicated backfill command exists for legacy rows. |
| Business/User Impact | Lower ongoing dependency on Google image fetches, more stable image hosting, and a clear operator path for migrating old data. |
| Delivery Shape | `Phased` |

This work started as a storage migration plan for place photos, but the repository architecture moved on before the plan was closed. The codebase no longer uses the originally proposed Supabase bucket path for this workflow. Instead, the actual implementation standardized on the shared storage layer in `@hominem/utils/storage`, with place image normalization and upload logic living in `@hominem/places-services`.

The final close-out on 2026-03-10 reconciled the plan to current code. The service layer and worker-based enrichment flow were already in place. The remaining gap was an explicit operator-facing backfill command for legacy place rows that still referenced Google-hosted photos. That command is now implemented and the stale Supabase-only planning doc has been retired in favor of this merged record.

## 3. Scope

### 3.1 In Scope

| Area | Change |
| --- | --- |
| Place image service | Kept `place-images.service.ts` as the canonical photo download, transform, and storage pipeline. |
| Backfill tooling | Added a runnable backfill command for existing places that still reference Google-hosted image URLs. |
| Documentation close-out | Replaced the outdated Supabase migration note with a merged record that matches the shipped R2/shared-storage architecture. |

### 3.2 Out of Scope

| Area | Rationale |
| --- | --- |
| Reintroducing Supabase-specific storage docs or commands | The implementation has already moved to the shared storage service and later Supabase removal work. |
| Bulk DB rewrites outside the place photo path | This change only needed the photo migration entrypoint, not a broader place schema redesign. |

## 4. Baseline and Targets

| Metric / Characteristic | Before | Target | Actual |
| --- | --- | --- | --- |
| Storage target in plan docs | `Supabase Storage` | Match shipped architecture | Shared storage service backed by current production storage path |
| Legacy place photo migration path | No explicit backfill command | One operator-facing command | `bun run backfill:place-images` |
| New place photo handling | Partially implemented | Normalize and persist through shared service | Implemented in `place-images.service.ts` and worker enrichment flow |

## 5. Architecture and Design Decisions

| Decision | Options Considered | Why Selected | Tradeoff |
| --- | --- | --- | --- |
| Keep place image storage behind shared storage services | Direct provider SDK usage, per-app storage logic, shared storage abstraction | Reuses the same storage boundary as the rest of the repo and avoids provider-specific coupling in feature code | Some old docs became stale and had to be reconciled later |
| Use a service + worker + backfill command combination | Only runtime lazy refresh, only one-shot script, or queue-only migration | Covers new writes, refreshes fetched places asynchronously, and provides an explicit one-time sweep for legacy rows | Operationally there are now multiple entrypoints to understand |
| Filter backfill candidates by current Google-hosted references | Reprocess every place row, or use a targeted candidate pass | Avoids unnecessary image downloads and rewrites for already-migrated rows | Candidate selection still depends on current stored metadata quality |

### 5.1 Final Architecture

Place photo downloads and uploads run through `@hominem/places-services`. New or refreshed places can enqueue photo enrichment through `placePhotoEnrichQueue`, and the worker resolves Google photo references into stored image URLs. For preexisting rows, the new backfill command scans for places whose current `imageUrl` or `photos` still point at Google-hosted sources and reprocesses only those candidates through the same shared service.

## 6. Implementation Breakdown

| Workstream | Key Changes | Owner | Status |
| --- | --- | --- | --- |
| Runtime place image pipeline | Kept the existing download, transform, thumbnail, and upload path in the places service | Platform | `done` |
| Async enrichment | Kept the worker-driven photo enrichment flow for runtime updates | Platform | `done` |
| Legacy backfill | Added a dedicated backfill command and package/root scripts for operational use | Platform | `done` |

### 6.1 File and System Footprint

| Path / System | Change Type | Notes |
| --- | --- | --- |
| `packages/places/src/place-images.service.ts` | `retained` | Canonical image download and storage pipeline already existed |
| `packages/places/src/places.service.ts` | `retained` | Existing Google photo refresh logic is reused by the backfill command |
| `services/workers/src/place-photo-worker.ts` | `retained` | Existing queue-based enrichment path remains the runtime async mechanism |
| `packages/places/src/backfill-place-images.ts` | `added` | Operator-facing backfill entrypoint for legacy rows |
| `packages/places/package.json` | `updated` | Added package-level `backfill:place-images` script |
| `package.json` | `updated` | Added root `backfill:place-images` command |
| `docs/plans/2026-01-29-place-images-migration.md` | `removed` | Replaced by merged doc |

## 7. Data and Migration Notes

| Topic | Details |
| --- | --- |
| Strategy | Runtime-safe shared-service migration plus explicit backfill command |
| Ordering | Existing service and worker stay in place; backfill command handles legacy rows separately |
| Safety Controls | Candidate filtering only targets places whose current image metadata still points at Google-hosted sources |
| Rollback | Stop running the backfill command and revert the script if needed; no schema rollback required |
| Residual Risk | Some image references may remain unchanged when upstream Google details do not return photo media or when upload fails |

## 8. Validation and Quality Gates

| Layer | What Ran | Result | Evidence |
| --- | --- | --- | --- |
| Local typecheck | `bun run --filter @hominem/places-services typecheck` | `pass` | Backfill command compiled successfully |
| Package tests | `bun run --filter @hominem/places-services test` | `environment-limited` | Existing integration tests failed with `ECONNREFUSED` to local Postgres, unrelated to the backfill script itself |
| Static inspection | Verified service, worker, and backfill entrypoint line up on the same photo update path | `pass` | `place-images.service.ts`, `places.service.ts`, `place-photo-worker.ts`, `backfill-place-images.ts` |

### 8.1 Known Gaps

| Gap | Impact | Mitigation |
| --- | --- | --- |
| No disposable local Postgres was running during package test execution | Medium for full local verification | Re-run `@hominem/places-services` tests with the normal local DB stack when validating broader place flows |
| The old plan referenced Supabase-specific verification commands | Low | This merged doc replaces them with the actual shared-storage architecture and backfill command |

## 9. Deployment and Operations

| Item | Details |
| --- | --- |
| Deployment Plan | Standard deploy; no schema migration ordering required |
| Dependencies | Google Places API, shared storage service, app base URL, database connectivity |
| Monitoring | Watch worker logs and backfill logs for repeated upload or Google media failures |
| Incident Response | Stop the backfill run, inspect failed place IDs, and retry targeted rows with `--place-id` |
| Rollback Trigger | Unexpected large-scale image rewrite failures or incorrect stored URLs during backfill runs |

## 10. Security and Compliance

| Check | Result | Notes |
| --- | --- | --- |
| Auth/AuthZ impact | `ok` | No auth model changes |
| Data handling impact | `ok` | Only media storage references are updated |
| Secrets/config changes | `no` | Uses existing Google API and storage environment configuration |

## 11. Learnings

| Learning | Action for Future Projects |
| --- | --- |
| Storage migration plans go stale quickly when provider choices change underneath them | Close old docs as soon as the implementation path changes materially |
| Backfill tooling should be added at the same time as the runtime migration path | Treat one-shot operational scripts as part of feature completeness, not optional follow-up work |
| Reusing one service path for runtime and backfill work reduces duplication | Prefer backfill commands that call existing services instead of re-implementing migration logic |

## 12. Follow-ups

| ID | Follow-up | Owner | Priority | Due Date | Status |
| --- | --- | --- | --- | --- | --- |
| `F-001` | Run the new `backfill:place-images` command against a disposable production-like dataset and capture the operational runbook | `Platform` | `P2` | `2026-03-24` | `open` |
