---
title: 'Merge personal-finance pipeline into @hominem/finance-services on Postgres'
status: 'In progress'
priority: 'high'
labels: [finance, db, import]
depends_on: []
estimated_size: 'L'
---

## Outcome

The `personal finance` (`pfin`) SQLite pipeline is absorbed into
`hominem/packages/finance` on the Postgres `app.finance_*` schema:
Copilot sign rules and description-split handling, ledger-native
reconciliation (`true-up`), live runway projection, transfer-pair and
reconciliation diagnostics, and a one-time backfill of the 20,560-row
prod archive. The standalone `personal finance` checkout becomes
read-only history.

## Scope

In scope: additive Postgres migration(s) (notably restoring
`finance_transactions.recurring`, dropped as write-never but required
by runway); pure sign/split/recurring helpers with unit tests; wiring
them into `create-import-plan` / `apply-import-plan`; `reconcile.ts`,
`runway.ts`, `diagnostics.ts` services with integration tests; a
throwaway idempotent backfill script; preflight preview surfacing of
sign-review flags; task-file evidence per slice.
Out of scope: restoring `finance_account_labels`, `finance_tax_*`,
`finance_statement_periods`, `merchants`, category `parent_id`,
int rowids, the `UNLINKED` placeholder, or a `pfin` CLI binary —
all deliberately left dropped (see work-sequence notes).

## Work sequence

| ID | Work item | Owner boundary | Depends on | Validation / artifact | Done when |
| --- | --- | --- | --- | --- | --- |
| W-001 | Restore `recurring` + Copilot sign/split helpers | `packages/db` migration, `packages/finance/src/import` | — | migration applied to dev+test DBs, codegen clean, `copilot-sign.test.ts` + import tests green | `resolveCopilotSign` (income always credit, transfers default-negated and flagged, unknown types flagged), `applyDescriptionSplits`, and `isRecurringActive` (non-empty and not `false`) are unit-tested; plan carries `needsReview`/`reviewReason`/`recurring` |
| W-002 | Reconciliation service (`true-up` port) | `packages/finance/src/reconcile.ts` | W-001 | `finance.reconcile.integration.test.ts` | Staleness view, per-description ledger breakdown, and `postReconciliationAdjustment` (sub-cent no-op, same-day guard with `force`, credit-card sign warning) behave like `pfin true-up` |
| W-003 | Ledger runway service | `packages/finance/src/runway.ts` | W-001 | `finance.runway.integration.test.ts` | `computeLedgerRunway` matches `pfin runway` math (liquid-type cash, trailing recurring average, budget-cap allowance) to 2dp on migrated data |
| W-004 | Diagnostics (transfer-pairs, gates) | `packages/finance/src/diagnostics.ts` | W-001 | `finance.diagnostics.integration.test.ts` | `findTransferPairs` and `getValidationGates` reproduce PF gate outputs on the same dataset |
| W-005 | One-time backfill SQLite/CSV to Postgres | `scripts/backfill-pfin-to-postgres.ts` (throwaway, excluded from exports) | W-001 | dry-run counts + per-account sums within 1c of PF baselines; re-run creates 0 rows | 20,560 txns mapped by natural key, idempotent on `(user_id, source, external_id)` |
| W-006 | API/RPC wiring + retire PF checkout | `services/api` finance routes, docs | W-002, W-003, W-004, W-005 | preflight/confirm e2e on migrated data; PF archived read-only | Read endpoints for reconcile/runway/pairs/gates and the `true-up` mutation are live; no `commander` CLI in the package |

## Acceptance criteria

- [ ] AC-001: `pnpm --filter @hominem/finance-services test` green with `DATABASE_URL` pointed at the test DB, plus package `typecheck`/`lint`/`format:check` clean.
- [ ] AC-002: Backfill reproduces PF `account_summary` balances within 1c per account; duplicate-group and sign-violation gates read 0.
- [ ] AC-003: Every Copilot `internal transfer` or unrecognized-type row is flagged for review before commit; no silent sign inference.
- [ ] AC-004: `personal finance` ADRs are preserved under `packages/finance/docs/adr-pfin/` before the checkout is archived.

## Exit gate

Close only when AC-001 through AC-004 are recorded with evidence, the
backfill verification numbers are pasted into this file's progress
notes, and the PF checkout is tagged read-only.

## Open decisions (require user input, do not assume)

- OPEN-001: Per-user home for description-split rules (replaces PF's
  `data/description-account-splits.json`, e.g. the Apple Savings /
  American Express Savings collision). No user-specific collision is
  hardcoded in generic code in W-001; splits ship as an option that
  defaults to empty until the user picks a settings home.
- OPEN-002: Per-user home for runway assumptions (replaces PF's
  `data/runway-assumptions.json`); W-003 takes them as function args.

## Progress evidence

- W-001: worktree `feature/merge-personal-finance` created from `main`
  (`eeb1964fc`); env synced via `scripts/sync-worktree-env.sh`.
- W-001 done: migration `20260908000000_restore_finance_transactions_recurring`
  applied to dev (5434) and test (4433) DBs, `just db validate` clean on both,
  codegen is a one-line `recurring: Generated<boolean>` addition.
  `copilot-sign.ts` (+11 tests) and 4 new plan tests green: import suite
  22/22, full `@hominem/finance-services` suite 13 files / 43 tests green.
  Package `typecheck`/`lint`/`format:check` clean (only pre-existing
  `analytics.ts`/`apply-import-plan.ts` assertion warnings); `@hominem/api`
  typecheck clean. Transfers now default-negate AND flag `needsReview`
  (surfaced in preflight preview); `recurring` persists on import.
- W-002 done: `src/reconcile.ts` with `getReconciliationStaleness`,
  `getAccountLedgerBreakdown`, and `postReconciliationAdjustment` (sub-cent
  no-op, same-day guard with `force`, credit-card/loan sign warning,
  deterministic `balance-recon|` external ids); 7 integration tests green,
  full suite 14 files / 50 tests green, package gates clean.
- W-003 done: `src/runway.ts:computeLedgerRunway` (liquid-type ledger cash,
  trailing `recurring` average excluding adjustments/credits/out-of-window
  rows, budget-cap allowance, chained weekly projection; assumptions are
  function args per OPEN-002); 4 integration tests with hand-computed 2dp
  values green, full suite 15 files / 54 tests green, package gates clean.
- W-004 done: `src/diagnostics.ts` with `findTransferPairs` (same-amount
  cross-account `transfer` legs within a day window) and
  `getValidationGates` (orphans, empty accounts, duplicate groups, sign
  violations, category coverage); 3 integration tests green, full suite
  16 files / 57 tests green, package gates clean. Caught and fixed a real
  scoping bug: an unparenthesized `AND`/`OR` in the sign-violation
  predicate leaked other users' credit rows (AND binds tighter); the
  regression test now seeds a stranger's violation to guard it.
