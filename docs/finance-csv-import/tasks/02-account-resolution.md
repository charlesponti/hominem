---
title: "Phase 1: account resolution (pure) — no duplicate accounts"
order: 2
phase: core-engine
status: blocked
depends_on: ["01-csv-parsing"]
blocked_by_decisions: [D4, D5]
area: backend
---

# Phase 1 — Account resolution (pure)

## Goal

Given a `ParsedFile` (from task `01`) and a plain in-memory snapshot of the user's existing accounts (`AccountSnapshot[]`), decide which account each row belongs to — reusing an existing account wherever possible, and never creating more than one new-account draft per distinct account actually present in the file. This is the core of "the app should determine which accounts transactions go to" without ever producing duplicate accounts.

No DB access here — `AccountSnapshot[]` is passed in as a plain array (a fixture in tests; a real query result in phase 2).

## Location

`packages/finance/src/import/resolve-accounts.ts`.

## Algorithm

1. **Detect an account-identifying column** in the rows (from task `01`'s header mapping): a masked account/card number (`****1234` → last4) or a free-text label (`"Chase Freedom"`, an institution name column).
2. **Group rows by a normalized account fingerprint**. A fingerprint must be stable across exports and independent of a database account UUID. Prefer a normalized mask; otherwise use a normalized institution/account label. If no stable identifier exists, return an explicit unresolved group rather than silently creating a generic account.
3. **Per group, resolve against `AccountSnapshot[]`**:
   - Last4 → match `mask`.
   - Label → match through one named, tested normalization rule against `name` and institution metadata.
   - No stable identifier → unresolved; filename-only matching is not sufficient for an automatic write.
4. **Resolution outcome per group**:
   - Exactly one confident match → attach `accountId` to every `TransactionDraft` in that group.
   - No match → emit exactly **one** `NewAccountDraft` for the group (not one per row), with `tempId`, `mask` (if extracted), `name` (from the label/institution/filename, or a generic `"Imported <date>"` fallback), `provider: 'csv-import'`, `institutionId: null`. Attach `accountTempId` to every `TransactionDraft` in that group.
   - Multiple matches or insufficient confidence → emit an `AccountResolutionFailure`; do not insert the group and do not create a new account.

## The no-duplicate-accounts guarantee (must be tested directly)

Once a `NewAccountDraft` is created and persisted (phase 2, task `04`), its deterministic `importKey` is stored with the account. **Test this property explicitly**, not just its inputs/outputs in isolation:

```
plan1 = resolveAccounts(fileA.rows, existingAccounts = [])
// plan1 → one NewAccountDraft with a deterministic importKey

simulatedAccounts = existingAccounts + [applyDraft(plan1.newAccount)] // fixture, not a real DB write

plan2 = resolveAccounts(fileA_again.rows, simulatedAccounts)
// assert: plan2 emits ZERO new account drafts and resolves every row to the existing account's id
```

Also test the **multi-account file** case: a single CSV containing two distinct account identifiers must resolve to exactly two drafts/matches, not one per row and not collapsed into one.

Also test two concurrent resolution/apply attempts with the same unmatched fingerprint. The database result must contain one account, and both plans' transaction drafts must point to that account after application.

## Edge cases / gotchas

- A 30,000-row single-account file must produce **at most one** `NewAccountDraft`, never per-row duplicates — this is an easy bug to introduce (e.g. accidentally keying dedup by row instead of by group).
- Filename-based matching is not an automatic resolution rule. It may be retained as diagnostic metadata, but must not attach or create transactions by itself.
- The exact normalization rule for labels and the minimum confidence required for a match are product decisions, not implementation details. Mark them `OPEN — USER DECISION REQUIRED` until resolved.
- `importKey` must be persisted. The current schema has no suitable uniqueness key for CSV-created accounts, so task `04` must either add one via an approved migration or use an atomic alternative that is proven under concurrent imports.

## Decisions required before implementation

- **D4 — stable account identity:** approve the fingerprint inputs used to derive `importKey`.
- **D5 — unresolved matches:** approve that ambiguous or identifier-free files fail safely rather than auto-creating or best-guessing an account.
