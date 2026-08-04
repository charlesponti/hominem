---
title: "Phase 2: GET /api/finance/import/jobs"
order: 6
phase: app-wiring
status: ready
depends_on: []
blocked_by_decisions: []
area: backend
---

# `GET /api/finance/import/jobs`

## Summary

Returns the current user's import jobs (queued/processing/recently finished), sourced entirely from the existing Redis job-tracking helpers (`packages/queues/src/service.ts`: `getUserJobs`, `getActiveJobs`) — no new storage. This is what the frontend hydrates from on mount so a page refresh mid-import doesn't show an empty list (task `09`).

## Work

1. Resolve the authenticated user from the existing session middleware (same pattern as other finance routes).
2. Call `getUserJobs(userId)` and return only that user's jobs. Do not return the global result of `getActiveJobs()`; it is not user-scoped and would leak other users' job metadata.
3. Keep the response shape identical to what the WS `'import:progress'`/`'subscribed'` messages carry (task `08`), so the frontend can use one merge/reconcile path for both.

## Edge cases

- Respect the existing TTL-based cleanup (`JOB_EXPIRATION_TIME`) — reflect whatever the Redis layer currently considers active/recent, not further back than that data persists.
