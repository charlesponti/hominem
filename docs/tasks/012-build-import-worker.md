---
title: "Build the frozen Copilot import worker"
status: "done"
priority: "high"
labels: [finance, copilot, bullmq, worker]
depends_on: ["006-add-import-state-and-queue-contract.md", "009-confirm-frozen-import-plan-api.md", "010-implement-import-plan-persistence.md", "011-materialize-copilot-metadata.md"]
blocks: ["013-add-job-list-and-cancellation-api.md", "014-add-import-websocket-server.md", "016-add-import-integration-tests.md", "017-run-copilot-end-to-end-verification.md"]
estimated_size: "L"
---

## Objective

Execute frozen Copilot plans in BullMQ with progress, retry, cancellation, and failure reconciliation.

## Context

The worker must not reparse or re-resolve. It applies the confirmed plan in batches and keeps partial writes on failure.

## Requirements

- Register a worker for the import queue.
- Load the frozen plan by owner-scoped plan reference.
- Apply transaction batches through task 010.
- Carry deduplication state across all batches.
- Publish progress after each batch.
- Configure explicit retry and backoff behavior.
- Check cancellation between batches.
- Mark jobs `done`, `error`, or `cancelled` with final actual stats.
- Reconcile BullMQ failed/stalled events into the user-facing Redis status.
- Clean up frozen plan data after terminal completion according to retention policy.

## Implementation Notes

- Use explicit worker concurrency rather than BullMQ’s implicit default.
- Do not log CSV contents, notes, account labels, tokens, or credentials.
- Keep cancellation between batches; already-written rows remain.

## Acceptance Criteria

- [ ] A confirmed plan completes without rereading the original CSV.
- [ ] Progress totals and counts reflect actual writes.
- [ ] Retrying after a failed batch does not duplicate prior rows.
- [ ] Cancellation stops before the next batch and reports partial stats.
- [ ] Stalled or failed BullMQ jobs cannot remain indefinitely in `processing`.

## Testing

- Add worker tests for success, retry, partial failure, cancellation, stall reconciliation, and progress publication.

