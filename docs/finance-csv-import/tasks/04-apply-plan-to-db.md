---
title: "Phase 2: apply ImportPlan to the database"
order: 4
phase: app-wiring
status: blocked
depends_on: ["01-csv-parsing", "02-account-resolution", "03-import-planning-dedup"]
blocked_by_decisions: []
area: backend
---

# Phase 2 — Apply `ImportPlan` to the database

## Summary

Thin layer, deliberately kept simple because all the hard decisions were already made and tested in phase 1. Takes an `ImportPlan` (from task `03`) and persists it: create any `accountsToCreate`, resolve their `tempId`s to real ids, then batch-insert `transactionsToInsert` (linking `accountTempId` rows to the newly-created account ids).

This is also where `packages/finance/src/transactions.ts:355-361`'s current stub (`processTransactionsFromCSVBuffer`, which ignores its input and returns `{ imported: 0, skipped: 0 }`) gets replaced — it becomes the function that runs the phase 1 pipeline and calls this apply step.

## Work

1. Create accounts from `accountsToCreate` (`app.financeAccounts` insert), building a `tempId → real id` map.
2. Batch-insert `transactionsToInsert` (~500/batch) into `app.financeTransactions`, substituting `accountTempId` → real id via the map above.
3. Persist or atomically derive the draft's `importKey` so concurrent imports cannot create duplicate CSV accounts. The current schema has no CSV-account uniqueness constraint; add an approved migration or provide an equivalent atomic find-or-create proof before implementation.
4. Use `ON CONFLICT (user_id, source, external_id) DO NOTHING` on the insert as a **defense-in-depth backstop** — phase 1 already pre-filtered duplicates against a snapshot, but that snapshot can be stale under concurrent imports. The DB constraint is the actual source of truth; the in-memory pre-filter is an optimization/reporting aid, not the sole guarantee.
4. Return actual applied counts (which may differ slightly from the plan's predicted counts if the DB constraint caught something the snapshot missed) so job stats reflect reality.

## Edge cases / gotchas

- **Partial failure**: what happens if account creation succeeds but the transaction batch insert fails partway through (e.g. row 15,000 of 30,000)? Since transaction inserts are idempotent (`ON CONFLICT DO NOTHING`), a retry of the whole batch is safe — decide whether to wrap each batch in its own DB transaction (recommended: batch-level transactions, not one giant transaction for all 30k rows, so a failure only needs to retry the current batch).
- **Snapshot staleness**: planning may be batched, but the working `existingTransactionKeys` set must live for the entire file and be updated after every planned row. Refreshing only from the database is insufficient because a prior batch may not be visible through the next snapshot in the same transaction model.
- Confirm this function's DB writes are scoped to the authenticated `userId` throughout — an account or transaction created here must never be able to attach to another user's data.
