---
title: "Phase 2: POST /api/finance/import"
order: 5
phase: app-wiring
status: blocked
depends_on: ["04-apply-plan-to-db"]
blocked_by_decisions: []
area: backend
---

# Copilot preflight and confirmation routes

## Summary

Add `POST /api/finance/import/preflight` for one Copilot CSV and `POST /api/finance/import/preflight/:preflightId/confirm` for explicit mappings and row selection. Account resolution is automatic only for confident exact matches; unresolved groups require user mapping.

## Work

1. Parse multipart body with `c.req.parseBody()` (existing pattern: `services/api/src/rpc/routes/files.ts:94`).
2. **Add an explicit request body size limit.** No `bodyLimit` middleware or equivalent exists anywhere in `services/api` today, and no reverse-proxy config is committed to this repo to fall back on. Pick a limit sized for the ~30k-row target (a few MB typical, add headroom, then cap hard).
3. Generate `jobId`, store CSV content in Redis via a new explicit queue-service storage helper, and write the initial `queued` job status through the new authoritative job-status helper. Do not treat the current read-only helpers as sufficient.
4. Enqueue an `ImportTransactionsQueuePayload` onto `importTransactionsQueue`.
5. Return `ImportRequestResponse { success, jobId, fileName, status: 'queued' }`.

## Edge cases / gotchas

- The existing multipart pattern (`files.ts:110`) reads the whole file into memory (`Buffer.from(await file.arrayBuffer())`) — acceptable for a few-MB CSV, just don't let the "streaming" goal (which applies to the worker's *parse* step, task `01`) get confused with this upload step.
- Reject obviously-wrong content types before enqueueing (not `.csv`/`text/csv`), though full malformed-content detection happens in task `01`'s parser, not here.
