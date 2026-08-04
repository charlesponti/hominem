---
title: "Phase 2: job cancellation (queued and in-progress)"
order: 11
phase: app-wiring
status: blocked
depends_on: ["07-import-worker", "10-frontend-jobid-matching"]
blocked_by_decisions: []
area: fullstack
---

# Job cancellation

## Summary

Today `removeFileStatus(fileName)` only hides a row from local UI state — it never touches the underlying BullMQ job. A user who "removes" an in-progress import still gets its transactions inserted in the background, with no UI reflecting that it's still running.

## Work

1. **Backend**: `POST /api/finance/import/:jobId/cancel` —
   - Queued job: remove it from the queue outright.
   - In-progress job: set a "cancel requested" flag in Redis that the worker (task `07`) checks between batches, stopping cleanly.
   - Add an explicit `'cancelled'` `JobStatus` so cancellation is not presented as an error. Persist the terminal state after queued removal or the worker's between-batch stop.
2. **Frontend**: change "Remove" to call this endpoint for queued/processing jobs; keep the existing "hide from list" behavior for already-`done`/`error` jobs.

## Edge cases

- A cancel request racing with the worker finishing its last batch: fine either way, but the UI should reflect whichever actually happened.
- Cancelling a job that already inserted some rows leaves those rows in place. This partial-import behavior is intentional and must be shown clearly in final stats/UI.
