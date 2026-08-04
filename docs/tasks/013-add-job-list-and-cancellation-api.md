---
title: "Add import job listing and cancellation APIs"
status: "todo"
priority: "high"
labels: [finance, api, cancellation]
depends_on: ["006-add-import-state-and-queue-contract.md", "012-build-import-worker.md"]
blocks: ["015-wire-frontend-job-state.md", "016-add-import-integration-tests.md", "017-run-copilot-end-to-end-verification.md"]
estimated_size: "M"
---

## Objective

Expose authenticated job hydration and cancellation controls.

## Context

Refreshes must restore the user’s jobs, and cancellation must affect BullMQ or the worker rather than merely hiding UI state.

## Requirements

- Add `GET /api/finance/import/jobs` returning only the authenticated user’s jobs.
- Add `POST /api/finance/import/jobs/:jobId/cancel`.
- Remove queued jobs from BullMQ when possible.
- Set a cancellation flag for active jobs.
- Validate job ownership before every operation.
- Return explicit `cancelled` status for terminal cancellation.
- Preserve partial transaction rows after active cancellation.

## Implementation Notes

- Never use the global active-job set as a user response without filtering.
- Handle cancellation racing with job completion deterministically by reporting the terminal state that won.

## Acceptance Criteria

- [ ] Refresh hydration returns only the current user’s jobs.
- [ ] Queued cancellation removes or terminally cancels the queue job.
- [ ] Active cancellation causes the worker to stop between batches.
- [ ] Another user cannot inspect or cancel the job.
- [ ] Completed jobs remain immutable when cancellation arrives late.

## Testing

- Add API integration tests for listing, queued cancellation, active cancellation, ownership, and race behavior.

