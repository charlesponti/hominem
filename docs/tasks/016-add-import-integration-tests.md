---
title: "Add end-to-end Copilot import integration tests"
status: "todo"
priority: "high"
labels: [finance, copilot, integration-test]
depends_on: ["005-implement-row-identity-and-plan.md", "010-implement-import-plan-persistence.md", "011-materialize-copilot-metadata.md", "012-build-import-worker.md", "013-add-job-list-and-cancellation-api.md", "014-add-import-websocket-server.md"]
blocks: ["017-run-copilot-end-to-end-verification.md"]
estimated_size: "XL"
---

## Objective

Prove the real API, Redis, BullMQ, database, and WebSocket path for Copilot imports.

## Context

Pure unit tests cannot prove ownership, concurrency, retries, queue behavior, or actual analytics effects.

## Requirements

- Test preflight creation through confirmed job completion.
- Test multi-account mapping and new-account creation.
- Test repeated-row selection and re-import idempotency.
- Test concurrent account creation.
- Test transaction conflict handling and retry after partial failure.
- Test metadata, hierarchical tags, pending, transfer, and excluded behavior.
- Test queued and active cancellation.
- Test user isolation across preflight, jobs, progress, and account IDs.
- Test WebSocket reconnect snapshots and progress filtering.

## Implementation Notes

- Reuse the sanitized Copilot fixture from task 001.
- Use the repository’s explicit database migration/test database workflow.
- Do not use the raw local export in CI.

## Acceptance Criteria

- [ ] The complete confirmed-import path reaches terminal success with expected counts.
- [ ] Re-importing the same plan inserts zero duplicate transactions.
- [ ] Partial failures and retries produce correct final counts.
- [ ] All ownership and real-time isolation assertions pass.

## Testing

- Add API, database, Redis, BullMQ, worker, and WebSocket integration coverage in the repository’s standard test lane.

