---
title: "Phase 2: integration tests across the phase 1/phase 2 boundary"
order: 12
phase: app-wiring
status: blocked
depends_on: ["04-apply-plan-to-db", "05-api-upload-route"]
blocked_by_decisions: []
area: backend
---

# Integration tests

## Note

Tasks `01`–`03` (phase 1) already specify their own unit tests inline, run entirely as plain function calls against fixtures — those are not repeated here. This task covers only what phase 1's fixtures can't: the real Postgres/Redis/BullMQ path.

## Work

1. **DB-integration dedup test**: apply an `ImportPlan` twice against a real test DB (task `04`), assert the second application inserts zero rows and the `ON CONFLICT` backstop actually fires (not just the in-memory pre-filter).
2. **DB-integration account test**: apply a plan that creates a new account, then apply a second plan (second file, same source) against real DB state, assert it resolves to the existing account row rather than creating a duplicate.
3. **Concurrent account test**: run two applies with the same unmatched `importKey` concurrently and assert exactly one account exists.
4. **API route integration test**: `POST /api/finance/import` → job created in Redis → enqueued → (via a test worker instance or direct function call) job reaches `'done'` with expected stats.
5. **Cancellation test** (once task `11` lands): cancel a queued job (removed from queue) and cancel an in-progress job (stops between batches, partial rows remain and status becomes `'cancelled'`).

## Notes

Reuse the fixture CSVs built in task `01` rather than inventing new ones — keep them in one shared location (e.g. `packages/finance/src/import/__fixtures__/`) since both phase 1 unit tests and these integration tests need the same inputs.
