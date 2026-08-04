---
title: "Phase 2: import worker (BullMQ consumer)"
order: 7
phase: app-wiring
status: blocked
depends_on: ["04-apply-plan-to-db", "05-api-upload-route"]
blocked_by_decisions: []
area: backend
---

# Import worker

## Summary

New file `services/api/src/workers/import-transactions.ts`, following the existing pattern in `embedding-generation.ts`/`file-processing.ts`: a module-level `Worker` singleton on `QUEUE_NAMES.IMPORT_TRANSACTIONS`, using the `@hominem/services/redis` connection (the same one the other two workers use). Registered in `services/api/src/worker.ts` alongside the existing two, including graceful-shutdown wiring.

This task is almost entirely glue: fetch the CSV, call the phase 1 pipeline + task `04`'s apply step in batches, report progress. All the actual decision logic was already built and tested in tasks `01`–`03`.

## Work

1. Fetch CSV content from Redis (`getImportFileContent(jobId)`).
2. Set status `'processing'`.
3. Read and parse the bounded file once, resolve accounts once for the complete file, then run `computeImportPlan` and apply in ~500-row transaction batches while carrying one working `existingTransactionKeys` set across the entire file. Find-or-create account drafts once before transaction batches.
4. After each batch: update Redis job stats, `job.updateProgress()`, publish to `import:progress`.
5. On completion: `status: 'done'` + final stats. On cancellation: `status: 'cancelled'` + partial stats. On error: `status: 'error'` + message.

## Edge cases / gotchas

- **No retry policy exists on any queue today** — none of the five queues in `packages/queues/src/index.ts` set `attempts`/`backoff`. Since the apply step (task `04`) is idempotent, retries are safe — explicitly configure `attempts`/`backoff` rather than leaving the accidental default (1 attempt, no retry).
- **Two independent job-state stores can drift**: BullMQ's own internal job state vs. the `packages/queues/src/service.ts` status blob. If the worker is killed uncleanly mid-batch, nothing reconciles "BullMQ says failed/stalled" with "our status blob still says processing." Wire `worker.on('failed', ...)`/`worker.on('stalled', ...)` handlers that also update the Redis job-status layer, plus a staleness backstop (a job stuck in `'processing'` with no update for N minutes → marked `'error'`).
- **Default concurrency (1) serializes all users' imports** behind whichever job is running. Set an explicit `concurrency` (e.g. 3-5).
- **`total` reporting** depends on the decision made in task `01` (pre-count pass vs. byte-based progress) — implement consistently here.
- **Cancellation** (task `11`): this worker needs to check a "cancel requested" flag between batches, not just run to completion unconditionally.
- **State helpers**: add explicit Redis helpers for create/update/cancel-request state. The current queue service only provides reads and deletion.
