# Merge `personal finance` → `hominem/packages/finance` (Postgres is target)

Target schema: hominem Postgres (`app.finance_*` via `packages/db`, Kysely + RLS + `user_id` scoping).
Source to absorb: `/Users/charlesponti/Developer/personal finance` (`pfin` SQLite pipeline, 20,560 txns, ADRs 0001–0016).
`personal_finance.db` / prod CSV archive is a **data source to backfill from, not a schema to keep**.

## 1. Current-state inventory

### 1a. `personal finance` (source)

| Area | Files | What it does |
|---|---|---|
| Build | `src/build.ts`, `src/schema.ts`, `src/loaders.ts` | Prod CSVs → SQLite, 8 tables + `account_summary` VIEW, 8 validation gates |
| CLI | `src/cli.ts` | `build/run/stats/accounts/reconcile/transfer-pairs/import-copilot/true-up/runway` |
| Ongoing import | `src/import-copilot.ts` | Fresh Copilot CSV → append to `finance_transactions.csv` (dedup key, sign rules, dry-run/`--commit`) |
| Reconciliation | `src/true-up.ts` | Posts dated `adjustment` plug transaction to close ledger→balance gap (ADR-0015) |
| Runway | `src/runway.ts` | Live projection: liquid-type cash + trailing `recurring` avg + `runway-assumptions.json` caps (ADR-0016) |
| Resolution | `src/account-resolve.ts` | Alias-index (exact → unambiguous substring ≥4ch) against built `account_aliases` |
| CSV helpers | `src/prod-csv.ts`, `src/util.ts`, `src/config.ts`, `src/types.ts` | Header, `csvLine`, `maxTxnIdSuffix`, money/date/table formatting, `data/*.json` overrides |
| Tests | `tests/` (8 files, 36 tests), `tests/fixtures.ts` | Prod-shaped fixture builder, no real data |
| Provenance | `docs/adr/0001–0016`, `scripts/gap-import-copilot.ts` (historical), `scripts/migrate-anchors-to-ledger.ts` (historical), `scripts/compare_db.mjs` | Keep ADRs; scripts are history only |
| Data | `sources/archive/finance.backup.202608312213.prod/*.csv` (sole truth), `data/*.json` overrides, `personal_finance.db` (product) | 20,560 txns, 35 accounts (34 real + UNLINKED) |

Key domain rules (all verified, see AGENTS.md §4 + ADRs): money-out-negative `amount`; `income` type always credit (ADR-0010); Apple Savings / Amex Savings label collision + `Deposit`/`Interest` always-credit (ADR-0006/0007); transfers default-negated but flagged (ADR-0001); ledger-native balances via `adjustment` rows (ADR-0015); no `statement_periods` (ADR-0009); `recurring` truthiness = non-empty ≠ `false` (series names like `Netflix` count).

### 1b. `hominem/packages/finance` (target, already exists)

| Area | Files | State |
|---|---|---|
| CRUD | `src/accounts.ts`, `src/transactions.ts`, `src/institutions.ts`, `src/plaid.ts` | UUID PKs, `user_id` scoped, balances = `SUM(amount)` over non-pending (ledger-native already — matches ADR-0015) |
| Import | `src/import/{parse-copilot-csv,resolve-copilot-accounts,create-import-plan,apply-import-plan}.ts` + tests + fixture | Newer plan-based flow (parse → resolve → plan → user confirms → apply in txn, tags, `onConflict(user_id,source,external_id)` dedup). **Supersedes PF's direct-append model** |
| Analytics | `src/analytics.ts`, `src/monthly-summary.ts`, `src/reports.ts`, `src/calculations.ts` | Tag-based breakdowns, monthly summary, net-worth (ledger sum), budget/loan/runway-math (generic, not ledger-wired) |
| Ops | `src/data-ops.ts`, `src/categories.ts` (thin tag wrappers), `src/utils.ts`, `src/contracts.ts` | Delete/export, tag CRUD, cents helpers |
| Tests | `finance.*.integration.test.ts`, `import/*.test.ts` (Kysely vs real test DB, `fileParallelism:false`) | Keep pattern |

### 1c. Effective Postgres schema (post `20260903*` drop migrations)

```text
app.finance_institutions(id, user_id?, name, logo_url)
app.plaid_items(id, user_id, institution_id, provider_item_id, cursor, access_token, status, …)
app.finance_accounts(id uuidv7, user_id, institution_id, plaid_item_id, name, account_type,
  currency_code, mask, lifecycle_status, include_in_net_worth, provider, plaid_account_id,
  csv_import_key, metadata)
app.finance_transactions(id uuidv7, user_id, account_id→accounts, amount numeric(14,2),
  transaction_type text, description, merchant_name, posted_on date, occurred_at,
  pending, excluded, source, external_id, notes, provider_payload jsonb,
  currency_code, category_id→categories)
app.finance_categories(id uuidv7, user_id, name)   // NO parent_id (dropped)
UNIQUE (transactions.user_id, source, external_id) // assumed from apply-import-plan onConflict
```

Dropped by `20260903000000/20260903010000` (deliberate dead-code removal): `finance_account_labels`,
`finance_statement_periods`, `finance_tax_filings(+events)`, `categories.parent_id`,
`accounts.{account_subtype,available_balance,current_balance,institution,opened_on,closed_on,is_active}`,
`transactions.{account_mask,recurring,category_assignment_source}`.

## 2. Schema map (SQLite → Postgres) and disposition

| PF SQLite | Postgres target | Disposition |
|---|---|---|
| `institutions(id int, name UNIQUE)` | `finance_institutions(id uuid, name, logo_url)` | Trivial. `ensureInstitutionExists(name)` already covers it. No migration |
| `accounts(id int rowid, inst→institution_id, type, subtype, mask, status, opened/closed, nw, placeholder)` | `finance_accounts` above | **Do not port int ids.** Map by natural key `(user_id, name+mask)` → UUID at backfill time. `status open/closed/needs_review` → `lifecycle_status` (`historical`→`closed`, keep PF `normalizeAccountStatus`). `include_in_net_worth` exists. `is_placeholder=UNLINKED` → **drop** (Postgres FK `account_id NOT NULL` + dedup makes it unnecessary; log unresolvable rows to import `invalidRows` instead). `opened_on/closed_on/subtype` were dropped as unread — **do not restore** unless a consumer needs them |
| `account_aliases(canonical+alias+historical)` | **dropped `finance_account_labels`** | PF's `account-resolve.ts` + hominem's `resolve-copilot-accounts.ts` (mask/label matching + `csvImportKey`) already cover the live need. **Do not restore the table.** Port only: `description-account-splits.json` handling + `income`-always-credit + transfer-flag rules (see §4) |
| `categories(name UNIQUE, parent_id)` | `finance_categories(name, no parent)` + `app.tags` hierarchy | **Do not restore `parent_id`.** Hominen direction is tags (`apply-import-plan` already writes parent/child category + free tags into `app.tags`). Map PF `category/parent_category` → tag creation at import; keep `transactions.category_id` as flat best-effort FK or null |
| `merchants(name)` | `transactions.merchant_name` string only | **Do not restore table.** PF's merchant list was 1–2 exact-match overrides; fold into import-time normalization if still wanted |
| `transactions(account_id, posted_on, amount signed, type debit/credit/transfer/adjustment, pending/excluded/recurring, notes, mask, external_id, source, matched_by, confidence, import_batch)` | `finance_transactions` above | Core map: `amount` signed convention **identical** — keep. `posted_on`, `pending`, `excluded`, `description`, `merchant_name`, `notes`, `source`, `external_id` map 1:1. `transaction_type` free text — `adjustment` already legal. **Restore `recurring boolean`** (dropped, but `runway.ts` needs it — see §4). **Do not restore** `account_mask` (lives in `accounts.mask` + `provider_payload`), `matched_by/confidence/import_batch` (fold into `provider_payload` JSON), `source_key` |
| `tax_filings(+events)` | dropped | **Do not restore.** No reader in either codebase's live path. Archive PF CSVs out of tree if retention needed |
| `account_summary` VIEW (balance=`SUM(amount)` non-excluded, last_txn) | `getBalances()` in `accounts.ts`, `getFinanceNetWorth()` in `reports.ts` | Already ledger-native. Port PF's `accounts`/`reconcile` **presentation** as functions, not a view |
| `statement_periods`, `runway_*`, `anchors/balances` | already dropped both sides | Stay dropped (ADR-0009/0015/0016 settled) |

**Migrations needed (small, additive):**
1. `…_restore_finance_recurring.sql` — `ALTER TABLE app.finance_transactions ADD COLUMN recurring boolean NOT NULL DEFAULT false` (+ index on `(user_id, posted_on)` where recurring, RLS untouched). Justification: dropped as "never copied on insert" — the fix is to **start copying it** (Copilot `recurring` column + PF truthiness rule), not to drop the consumer (`runway`).
2. Optional/later: `CHECK (transaction_type IN ('debit','credit','transfer','adjustment'))` — only after auditing existing rows; keep permissive until then.

No other schema change. In particular: no int-id columns, no labels/merchants/tax tables, no statement periods.

## 3. Capability gaps (what actually needs porting)

Hominem already has: CRUD, ledger-sum balances, Copilot parse/resolve/plan/apply with tag writes, analytics, monthly summary, generic budget/loan math.
PF uniquely has (port these, adapted):

1. **Sign rules + description splits** (`import-copilot.ts:resolveSign/applySplit`, ADR-0006/0007/0010) — hominem `normalizeAmount` is close but differs: PF forces `income→+abs`, default-negates `regular`, negates-but-flags `internal transfer`. Hominen keeps transfer raw amount. **Port PF semantics + `description-account-splits.json` shape into `create-import-plan.ts`.**
2. **`true-up`** (`true-up.ts` — plug `adjustment` insert, zero-gap no-op, duplicate-date guard, credit-card sign warning) → new `src/reconcile.ts:postReconciliationAdjustment()` (same math, but `INSERT` into Postgres in a txn, not CSV append).
3. **`runway` ledger wiring** (`runway.ts:computeRunway`) → new `src/runway.ts:computeLedgerRunway()` reading Postgres (liquid types → starting cash; trailing `recurring` debits → weekly outflow; budget caps config → allowance). Hominen `calculations.calculateRunway` is generic math — keep it, add the ledger query on top. Needs `recurring` column (§2).
4. **Read-only diagnostics** (`cli.ts:printReconcile*/printTransferPairs/printAccounts` + `build.ts` gates 1/2/4/7/8) → new `src/diagnostics.ts`: `getReconciliationStaleness()`, `getAccountLedgerBreakdown()`, `findTransferPairs()`, `getValidationGates()`. Pure SQL via Kysely, no CLI dependency.
5. **Backfill determinism check** (`scripts/compare_db.mjs` idea) → Postgres version: row-count + `SUM(amount)` per account + hash of `(account,posted_on,abs(amount),lower(description))` before/after; assert in backfill script.
6. **Tests/fixtures** (`tests/fixtures.ts` prod-shaped builder) → extend `src/test-utils.ts` + `import/__fixtures__/copilot-money.csv` with PF edge cases (income-negative, Apple/Amex collision, transfer legs, recurring series names).

**Do not port:** `build.ts` SQLite DDL/loader, `loaders.ts` prod-CSV reader (except as throwaway backfill input parser), `schema.ts` DDL, `prod-csv.ts` id-minting (`uuidv7()`/randomUUID replaces it), `config.ts` path constants, `cli.ts` commander wiring (hominem exposes via API/RPC + services, not a `pfin` binary), `scripts/gap-import-copilot.ts` / `migrate-anchors-to-ledger.ts` (historical), `compare_db.mjs` SQLite version (rewrite, see above).

## 4. Design decisions (recommendations)

| # | Decision | Recommendation |
|---|---|---|
| D1 | ID mapping | PF int rowids are **not stable across systems**. Backfill maps PF account `(name,mask)` → existing-or-created UUID; transactions get fresh `uuidv7()`, `external_id` = `sha256('copilot-money\|…')` or existing prod `external_id` namespaced (`prod:<id>`). Idempotent via existing `onConflict(user_id,source,external_id)` |
| D2 | Multi-user | PF is single-user. Every ported query takes `userId` first arg, enforces RLS pattern used in `reports.ts`/`transactions.ts`. Backfill requires explicit `--user` |
| D3 | Categories vs tags | Follow hominem: categories flat, hierarchy lives in `app.tags` (already what `apply-import-plan` does). PF `parent_id` stays unported |
| D4 | `recurring` semantics | Restore column; write rule = PF truthiness (non-empty and ≠`false` → true) applied to Copilot `recurring` field at `apply-import-plan` time, plus preserve `raw` in `provider_payload` |
| D5 | Transfer sign | Adopt PF: `income→credit +abs`; `regular→debit -abs`; `internal transfer→transfer -abs(raw)` **+ always added to `needsReview`/flagged output** (PF review-table behavior → hominem `duplicateCandidateRowIds`-style surfacing, never silent) |
| D6 | UNLINKED placeholder | Drop. Unresolvable rows go to plan `unresolvedGroups`/`invalidRows` for user mapping (hominem already has this UX) |
| D7 | `true-up` guardrails | Keep all three: no-op on <1¢ gap; reject second same-day adjustment without `force`; warn on positive target for `credit_card`/`loan` (ledger is money-out-negative) |
| D8 | Runway config | `data/runway-assumptions.json` → per-user settings row or service arg (`{liquidAccountTypes, monthlyBudgets, lookbackMonths, projectionWeeks}`), defaults `cash/checking/savings`, 3mo, 16wk. No file I/O in package |
| D9 | Tax/statement/labels | Stay dropped. If compliance later needs tax filings, that's a separate proposal with a reader attached |

## 5. Phased plan

### Phase 0 — Freeze & baseline (0.5d)
- [ ] Tag `personal finance` HEAD (`git tag pfin-final-sqlite` + note commit hash).
- [ ] Record baselines from PF: `pnpm pfin stats`, `pnpm pfin accounts --all`, per-account `SUM(amount)` + counts CSV (expected values for §7).
- [ ] Confirm target hominem user(s) for backfill + that test DB (`TEST_DATABASE_URL`) is green on `packages/finance` today.
- [ ] Copy `docs/adr/0001–0016` into `hominem/packages/finance/docs/adr-pfin/` (history preservation; no rewrite).

### Phase 1 — Schema + pure-logic ports, no data movement (1–2d)
- [ ] Migration: re-add `transactions.recurring boolean NOT NULL DEFAULT false` (+ partial index). Regenerate Kysely types (`database.ts`).
- [ ] `src/import/copilot-sign.ts` (new, pure): `resolveSign()` + `applyDescriptionSplits()` ported from PF, unit-tested against PF cases (income-negative, Apple Savings deposit/interest force-credit, transfer-flag, unknown-type-flag).
- [ ] Wire into `src/import/create-import-plan.ts`: use `copilot-sign.ts`; surface flagged rows (transfer/unknown-type) in plan stats; carry `recurring` truthiness + `accountMask`→`provider_payload` through `PlannedTransaction`.
- [ ] `src/import/apply-import-plan.ts`: persist `recurring`, keep `onConflict` dedup; ensure category/parentCategory/tags → `app.tags` path unchanged.
- [ ] Tests: extend `src/import/*.test.ts` with PF fixture rows (no DB needed for sign/split tests).

### Phase 2 — Services: true-up, runway, diagnostics (2–3d)
- [ ] `src/reconcile.ts` (new): `getReconciliationStaleness(userId)` (last `adjustment` per account, oldest-first — PF `reconcile` no-arg), `getAccountLedgerBreakdown(userId, accountId)` (per-description n/pos/neg/signed/abs — PF `reconcile <acct>`), `postReconciliationAdjustment({userId, accountId, targetBalance, date, note, force})` (PF `true-up` semantics, Kysely txn insert of `transaction_type='adjustment'`, `source='balance-reconciliation'`).
- [ ] `src/runway.ts` (new): `computeLedgerRunway(userId, {liquidAccountTypes, monthlyBudgets, lookbackMonths, projectionWeeks, asOf})` — direct port of PF `computeRunway` math over Kysely (`account_summary`-equivalent via `getBalances`, recurring trailing avg with `WEEKS_PER_MONTH=365.25/12/7`). Keep `calculations.ts` generic fns untouched.
- [ ] `src/diagnostics.ts` (new): `findTransferPairs(userId, {windowDays=2, minAmount=100, limit=50})` (same-amount cross-account `transfer` legs — PF SQL), `getValidationGates(userId)` (FK check→orphan-txn query, unlinked→unresolved count, duplicates by account/date/|amount|/lower(desc), sign-consistency violations, category coverage).
- [ ] Unit + integration tests: `finance.reconcile.integration.test.ts`, `finance.runway.integration.test.ts`, `finance.diagnostics.integration.test.ts` following existing `finance.*.integration.test.ts` + `test-utils.ts` pattern.

### Phase 3 — One-time backfill SQLite→Postgres (1–2d, throwaway code)
- [ ] `scripts/backfill-pfin-to-postgres.ts` (**not** shipped in package exports): reads PF prod CSVs (or `personal_finance.db` via `node:sqlite` — prefer CSVs, the declared sole truth) with PF `cleanName`/`toFloat` semantics; resolves accounts (PF `buildRegistry` rules: merchant exclusions, `mergeIntoAccount`, `historical`→`closed`, status overrides); inserts institutions/accounts (by name, idempotent) then transactions in batches with `source='hominem-prod'` (or original `source`), namespaced `external_id`, `recurring` truthiness, `category_id` best-effort or null + tags.
- [ ] Idempotent + resumable (skip on `(user_id,source,external_id)` conflict); `--user`, `--dry-run` (counts + first-N preview), `--commit`.
- [ ] Verify (§7) before proceeding. Keep script in-repo for audit, excluded from exports.

### Phase 4 — API/RPC wiring (1d)
- [ ] Expose via existing `@hominem/api/finance` routes (check `packages/rpc/src/finance.ts` + API package): monthly-summary/analytics pattern → add `reconcile`, `runway`, `transfer-pairs`, `gates` read endpoints + `true-up` mutation. No `commander` CLI in package.
- [ ] If an ops CLI is wanted, add it as a thin `apps/`-level script calling the services (not a second `pfin` binary in the package).

### Phase 5 — Cutover & retire (0.5d)
- [ ] Update `hominem/packages/finance` README + `packages/db` docs: Postgres is the system of record; PF ADRs linked.
- [ ] Archive `personal finance` repo (read-only; tag from Phase 0). Do **not** delete prod CSVs until Phase 3 verification is signed off; then keep one compressed backup out of tree per ADR-0004 spirit.
- [ ] Delete nothing in hominem until new tests green + backfill verified.

## 6. File-by-file disposition (PF → hominem)

| PF file | Verdict | Hominen destination |
|---|---|---|
| `src/build.ts` (gates/registry/insert) | Port **logic fragments only** | Gates → `diagnostics.ts`; registry rules → backfill script; sign/recurring truthiness → `copilot-sign.ts` |
| `src/import-copilot.ts` | Port rules, drop CSV-append | `import/copilot-sign.ts` + `create-import-plan.ts` edits |
| `src/true-up.ts` | Port | `src/reconcile.ts:postReconciliationAdjustment` |
| `src/runway.ts` | Port math+queries | `src/runway.ts:computeLedgerRunway` |
| `src/cli.ts` (`reconcile/transfer-pairs/accounts/stats`) | Port presentation as queries | `src/diagnostics.ts` + `src/reconcile.ts` |
| `src/account-resolve.ts` | Concepts only (alias→substring) | Already in `import/resolve-copilot-accounts.ts`; add split-table support |
| `src/schema.ts`, `src/loaders.ts` (prod readers), `src/prod-csv.ts`, `src/config.ts` | **Do not port** | Backfill script may vendor minimal CSV parsing; package keeps zero file-path constants |
| `src/util.ts` (`cleanName/toFloat/printTable`) | Port `cleanName`/amount truthiness as needed | Small helpers into `utils.ts` or `copilot-sign.ts`; no table-printing in library |
| `src/types.ts` (`AccountOverrides`, `DescriptionAccountSplit`, `RunwayAssumptions`) | Port shapes, not paths | `RunwayAssumptions`-equivalent as function args; splits as import-config type |
| `data/*.json` | Migrate **values**, not files | Bake current alias/split/budget values into backfill config + user settings; leave files in archived repo |
| `tests/fixtures.ts` | Port cases | Extend `test-utils.ts` + `import/__fixtures__` |
| `docs/adr/*` | Preserve | Copy to `packages/finance/docs/adr-pfin/` |
| `scripts/gap-import-copilot.ts`, `migrate-anchors-to-ledger.ts`, `compare_db.mjs` | Historical | Leave archived; write new Postgres verification in backfill script |

New/edited hominem files: `src/import/copilot-sign.ts` (new), `src/reconcile.ts` (new), `src/runway.ts` (new), `src/diagnostics.ts` (new), `src/import/{create-import-plan,apply-import-plan}.ts` (edit), `packages/db/migrations/*_restore_finance_recurring.sql` (new), `scripts/backfill-pfin-to-postgres.ts` (new, throwaway), `docs/adr-pfin/` (new), tests (3 new integration + import unit extensions).

## 7. Verification & acceptance

- [ ] `pnpm --filter @hominem/finance-services test` green (existing + new suites), `typecheck/lint/format` clean.
- [ ] Backfill dry-run counts match PF baselines: total txns 20,560 (± documented deltas for excluded/placeholder handling), 34 real accounts, per-account `SUM(amount)` within 1¢ of PF `account_summary.balance` (differences only where documented: excluded-row handling must match PF `CASE WHEN excluded=0`).
- [ ] Determinism/hash check: `COUNT + SUM(amount)` per `(account, month)` + duplicate-group count equal PF gates output; sign-consistency violations = 0; unlinked/unresolved = 0 after user confirms mappings.
- [ ] `true-up` dry-run on one account reproduces PF plug to the cent; `runway` spot-check vs `pfin runway` with same assumptions/date within rounding (2dp).
- [ ] `transfer-pairs` spot-check returns same top pairs as PF on the migrated dataset (modulo id representation).
- [ ] Rollback: backfill is idempotent; re-running with same `--user` creates 0 new rows (all conflicts skipped). Postgres backup taken pre-backfill.

## 8. Risks / open questions

1. **Account identity**: PF matched on exact display names; hominem matches on mask/label/`csvImportKey`. Backfill needs a manual mapping pass for any of the 34 accounts that don't exact-match — budget half a day for user confirmation (same UX as `unresolvedGroups`).
2. **`category_id` coverage**: PF Gate 8 reports uncategorized rows; hominem analytics mostly use tags. Accept nulls + tags at backfill; don't block on perfect category mapping.
3. **Recurring data quality**: PF `recurring` mixes booleans and series names — truthiness rule handles it, but hominem future writes must set the boolean explicitly or runway degrades silently. Enforce in `apply-import-plan`.
4. **Scope creep (tax/labels/statement periods)**: explicitly out of scope per §2/D9. If asked to restore, require a named reader first (the reason they were dropped).
5. **Double-import**: PF archive already contains the 1,371 Copilot-backfilled rows (ADR-0012). Backfill must treat the archive as complete and **not** re-run old Copilot gap logic — dedup on `external_id` is the guard.

## 9. Suggested execution order (smallest safe slices)

1. Migration + `copilot-sign.ts` + plan wiring + tests (no data moves; shippable).
2. `reconcile.ts` + `diagnostics.ts` reads (safe, additive).
3. `runway.ts` (needs `recurring` from slice 1).
4. Backfill script + dry-run + verify.
5. RPC wiring + docs + archive PF.
