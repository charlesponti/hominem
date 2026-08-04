---
title: "Phase 1: import planning & dedup (pure) — no duplicate transactions"
order: 3
phase: core-engine
status: ready
depends_on: ["01-csv-parsing", "02-account-resolution"]
blocked_by_decisions: []
area: backend
---

# Phase 1 — Import planning & dedup (pure)

## Goal

`computeImportPlan(rows, resolvedAccounts, existingTransactionKeys) -> ImportPlan` — the function that decides, for each resolved row, whether it's a new transaction to insert or a duplicate to skip, and produces the final `ImportPlan` (see `../architecture.md` §3.2) that phase 2's task `04` will actually write to the database. Rows in unresolved account groups remain reported as account-resolution failures and are not inserted.

No DB access here — `existingTransactionKeys` is a plain `Set<string>` of `` `${accountId}:${source}:${externalId}` `` snapshotted from the database (a fixture in tests; a real query result in phase 2).

## Location

`packages/finance/src/import/compute-import-plan.ts`.

## Work

1. **Synthesize `external_id` per row deterministically** from `source`, the stable account `importKey`, normalized posted date, normalized signed amount, normalized description, and any source row identifier available from the CSV. Never use a temporary account ID or database account UUID. Always synthesize — never leave it unset/null.
2. **Choose `source`** as the literal `'csv-import'`. Keep it distinct from Plaid's source value; verify the existing Plaid writer before implementation.
3. **Map sign/type**: preserve the normalized signed amount and use `debit` for negative amounts and `credit` for nonnegative amounts, matching the existing transaction writer. The database also permits `transfer` and `adjustment`; CSV parsing must not emit those without an explicit source mapping.
4. **Map dates**: CSVs typically have one date column — map to `postedOn` (NOT NULL in the schema); leave `occurredAt` (nullable) unset unless the CSV clearly distinguishes transaction vs. posted date.
5. **Dedup check**: for each row's synthesized key, check membership in `existingTransactionKeys`. Present → increment `skipped`, don't emit a draft. Absent → emit a `TransactionDraft` **and add the key to a local working copy of the set**, so that duplicate rows *within the same file* also dedupe against each other, not just against pre-existing DB state.
6. Aggregate into `JobStats`-shaped counts (`created`, `skipped`, `invalid`) plus the `accountsToCreate`/`transactionsToInsert` arrays from task `02`'s output.

## The no-duplicate-transactions guarantee (the most important test in this whole feature)

```
existing = new Set()  // empty — first import

plan1 = computeImportPlan(fileA.rows, resolvedAccounts, existing)
// assert: plan1.transactionsToInsert.length === fileA.rows.length (all new)

simulatedExisting = existing + keysOf(plan1.transactionsToInsert)  // fixture, not a real DB write

plan2 = computeImportPlan(fileA_again.rows, resolvedAccounts, simulatedExisting)
// assert: plan2.transactionsToInsert === []
// assert: plan2.skipped === fileA.rows.length
```

This must pass — using nothing but plain function calls and fixture data — before phase 2 (any DB/API/worker code) is started. If this test can't be made to pass reliably, no amount of correct plumbing downstream will produce a working import feature.

Also test:
- **Duplicate rows within a single file** (a bank export that lists the same transaction twice) — the second occurrence must be skipped even though neither was in `existingTransactionKeys` to start.
- **Partial overlap**: a re-uploaded file covering a date range that partially overlaps a previous import — only the non-overlapping rows should appear in `transactionsToInsert`.

## Edge cases / gotchas

- **Never leave `external_id` null/unset.** The real DB's unique index doesn't dedupe `NULL` against `NULL` (standard Postgres behavior) — if the engine ever emits a draft without a synthesized id, it silently bypasses dedup entirely both in this in-memory check and later at the DB layer. Always synthesize one, even as a fallback path.
- **`external_id_not_blank` check constraint** exists on the real table — an empty-string id would fail the whole row at insert time, not skip silently. The synthesized-hash approach avoids this by construction (a hash is never empty).
- **Malformed-file vs. invalid-row**: rows that fail validation (task `01`) shouldn't reach this function at all — keep `invalidRows` and `transactionsToInsert`/`skipped` as clearly separate outcomes, and cap the invalid-row detail list (don't return 30,000 error strings for a badly-formed file).
- **Stable identity across batches**: the worker must pass one working key set through every batch. A duplicate in batch 2 must be skipped because of a row inserted or planned in batch 1.
- **`JobStats.merged`** (already in the shared type) isn't used by this exact-match design — don't populate it with anything misleading; leave it undefined unless a later fuzzy-matching feature is built.

## Testing (do this now, not later)

All of the above tests run as plain unit tests against fixture data — no Postgres, no Redis, no HTTP, no BullMQ. This is the entire point of doing this work in phase 1: the duplicate-account and duplicate-transaction guarantees are provable before any upload plumbing exists to get in the way of testing them.
