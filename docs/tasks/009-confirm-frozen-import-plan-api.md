---
title: "Confirm and enqueue the frozen import plan"
status: "todo"
priority: "high"
labels: [finance, copilot, api, bullmq]
depends_on: ["005-implement-row-identity-and-plan.md", "006-add-import-state-and-queue-contract.md", "007-build-preflight-api.md", "008-build-preflight-review-ui.md"]
blocks: ["010-implement-import-plan-persistence.md", "011-materialize-copilot-metadata.md", "012-build-import-worker.md", "015-wire-frontend-job-state.md"]
estimated_size: "M"
---

## Objective

Validate user choices, freeze the reviewed plan, and create one background import job.

## Context

The worker must execute exactly what the user confirmed and must not reparse or silently re-resolve the source file.

## Requirements

- Add `POST /api/finance/import/preflight/:preflightId/confirm`.
- Validate ownership, expiry, group mappings, selected row identities, and account choices.
- Atomically create explicitly selected new accounts or record them for task 010.
- Persist a frozen plan reference and create one queued BullMQ job.
- Return the job ID and initial queued status.
- Prevent a preflight from being confirmed twice.
- Preserve the preflight until confirmation succeeds, then clean up temporary content.

## Implementation Notes

- Confirmation is the authoritative boundary between review and execution.
- Use idempotency protection for repeated confirmation requests.
- Do not let the worker derive account mappings from raw CSV content.

## Acceptance Criteria

- [ ] Invalid mappings cannot create a job.
- [ ] A successful confirmation creates exactly one frozen plan and one queued job.
- [ ] Repeating the same confirmation is safe and does not enqueue duplicate work.
- [ ] The returned job references the frozen plan rather than only the raw CSV.

## Testing

- Add API integration tests for valid confirmation, invalid mappings, duplicate confirmation, expired preflight, and ownership isolation.
