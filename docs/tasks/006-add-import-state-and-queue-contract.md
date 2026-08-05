---
title: "Add preflight and import job state contracts"
status: "done"
priority: "high"
labels: [finance, redis, bullmq, contracts]
depends_on: ["005-implement-row-identity-and-plan.md"]
blocks: ["007-build-preflight-api.md", "009-confirm-frozen-import-plan-api.md", "012-build-import-worker.md", "013-add-job-list-and-cancellation-api.md", "014-add-import-websocket-server.md"]
estimated_size: "L"
---

## Objective

Define and implement the shared Redis, BullMQ, and TypeScript contracts for preflights and frozen import jobs.

## Context

The current queue types still contain `deduplicateThreshold` and request-level `accountId`. The current Redis service lacks creation, update, cancellation, and publication helpers.

## Requirements

- Remove `deduplicateThreshold` and request-level `accountId` from import contracts.
- Add `cancelled` to job status.
- Define preflight records with owner, raw file reference, proposed plan, expiry, and status.
- Define confirmed frozen-plan job payloads.
- Add Redis helpers for create, read, update, dismiss, expiry, cancellation request, and progress publication.
- Scope every read and mutation by authenticated user ID.
- Set preflight retention to seven days maximum.

## Implementation Notes

- Keep preflight data in Redis; do not revive the dropped import provenance tables.
- Store raw CSV content and the frozen plan under separate keys with one owner-scoped record.
- Preserve BullMQ state and user-facing status separately but reconcile failure, stall, and cancellation events.

## Acceptance Criteria

- [ ] All import producers and consumers compile against one shared contract.
- [ ] No import type contains `deduplicateThreshold` or request-level `accountId`.
- [ ] Preflight records expire after seven days at most.
- [ ] A user cannot read, dismiss, cancel, or update another user’s record.

## Testing

- Add unit tests for serialization, ownership checks, expiry, cancellation flags, and progress publication payloads.

