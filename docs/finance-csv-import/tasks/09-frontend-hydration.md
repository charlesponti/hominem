---
title: "Phase 2: frontend hydrate job state on mount"
order: 9
phase: app-wiring
status: blocked
depends_on: ["06-api-jobs-route"]
blocked_by_decisions: []
area: frontend
---

# Frontend: hydrate job state on mount

## Summary

Today `use-import-transactions-store.ts` only ever gets state from the POST response or a WebSocket push — no GET/poll on mount, so a page refresh mid-import currently loses all progress UI. Close that gap using `GET /api/finance/import/jobs` (task `06`).

## Work

1. On mount, call the jobs route and populate `statuses` before (or in parallel with) connecting the WebSocket.
2. Reconcile subsequent WS `'import:progress'`/`'subscribed'` pushes against this hydrated state rather than overwriting it wholesale.
3. Key this reconciliation by `jobId` (task `10`) — not `fileName`.

## Edge cases

- Handle the empty case (no active/recent jobs) cleanly.
- Decide whether the initial GET call is still useful once the WS `'subscribed'` snapshot (task `08`) also arrives — likely yes, for a faster first paint before the WS connects.
