# Finance Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## FIN-01 Accounts Domain Lifecycle
### Capability ID and entry points
- ID: `FIN-01`
- Entry points:
  - `packages/finance/src/features/accounts/accounts.domain.ts`
  - `packages/finance/src/features/accounts/accounts.repository.ts`
  - `packages/finance/src/features/accounts/accounts.service.ts`
  - `packages/hono-rpc/src/routes/finance.accounts.ts`

### Current inputs/outputs + guards
- Inputs: account create/update/list payloads.
- Outputs: account entities + plaid/institution projections.
- Guards: ownership mostly present but type contracts drift (`type` vs `accountType`).

### Current failure modes
- Field contract mismatch (`type`, `limit`, plaid fields missing in new schema).
- Legacy table references and stale type conversions.

### Modernization review
- Refactor options:
  - A) preserve existing repository conversions
  - B) strict account DTO aligned to new schema with adapter-free routes
  - C) maintain compatibility wrappers
- Selected modern contract: **B**

### Final target contract
- Canonical account shape uses `accountType` and current schema fields only.
- RPC payloads align exactly with service DTOs.

### Required RED tests
- Create/update/list/delete for owner.
- Non-owner update/delete denied.
- DTO validation rejects legacy-only fields.

### Required GREEN tasks
- Rewrite repository mappings.
- Remove stale field assumptions from routes.

### Legacy files/imports to delete
- Legacy casts expecting `type/limit/plaid*` fields outside schema.

### Execution status
- FIN-01 initial modernization is now active on `packages/finance/src/modern-finance.ts`:
  - `createAccount`, `listAccounts`, `getAccountById`, `updateAccount`, `deleteAccount` are DB-backed on `finance_accounts`
  - owner-scoped update/delete semantics enforced via user scoping
  - plaid account helpers now DB-backed:
    - `upsertAccount` idempotent by `data.plaidAccountId` per owner
    - `getUserAccounts` and `getAccountByPlaidId` query persisted account state
- DB-backed RED→GREEN integration suite added and green:
  - `packages/finance/src/modern-finance.accounts.integration.test.ts` (3 passing tests)
- finance package test runner is now scoped to modern-suite tests only while legacy finance surfaces are being decomposed:
  - `packages/finance/vitest.config.ts` include narrowed to `modern-finance*.test.ts` patterns.

## FIN-02 Transactions Query + Mutation
### Capability ID and entry points
- ID: `FIN-02`
- Entry points:
  - `packages/finance/src/finance.transactions.service.ts`
  - `packages/hono-rpc/src/routes/finance.transactions.ts`

### Current inputs/outputs + guards
- Inputs: query filters, create/update/delete payloads.
- Outputs: transaction records, list envelopes.
- Guards: ownership checks present but table symbols inconsistent.

### Current failure modes
- Missing `transactions` relation symbol in new schema.
- Query semantics can drift across filters and sort order.

### Modernization review
- Selected modern contract: transaction service built on partition-aware table contract from db redesign.

### Final target contract
- Query contract:
  - stable sort `(date desc, id desc)`
  - explicit filter DTO
  - deterministic pagination
- Mutation contract:
  - create/update/delete idempotency rules explicit.

### Required RED tests
- Stable pagination across repeated calls.
- Ownership enforcement on all mutations.
- Update/delete missing transaction behavior deterministic.

### Required GREEN tasks
- Align transaction queries with current finance schema and partition strategy.
- Remove stale relation/table assumptions.

### Legacy files/imports to delete
- Old table symbol usages not present in redesigned schema.

### Execution status
- FIN-02 now runs DB-backed on `finance_transactions` (parent partitioned table) in `packages/finance/src/modern-finance.ts`:
  - `queryTransactions` enforces stable `(date desc, id desc)` ordering
  - `createTransaction`/`updateTransaction`/`deleteTransaction` enforce owner-scoped mutation semantics
  - plaid transaction helpers (`insertTransaction`, `getTransactionByPlaidId`, `updatePlaidTransaction`, `deletePlaidTransaction`) are DB-backed
  - transaction mapper now returns `category` and `merchantName` to preserve modern analytics/budget usage
- DB-backed RED→GREEN integration suite added and green:
  - `packages/finance/src/modern-finance.transactions.integration.test.ts` (3 passing tests)

## FIN-03 Budget Tags/Goals/Tracking
### Capability ID and entry points
- ID: `FIN-03`
- Entry points:
  - `packages/db/src/services/tags.service.ts`
  - `packages/finance/src/contracts.ts`
  - `packages/finance/src/core/budget-goals.service.ts`
  - `packages/finance/src/core/budget-tracking.service.ts`
  - `packages/hono-rpc/src/routes/finance.budget.ts`

### Current inputs/outputs + guards
- Inputs: budget category/goal operations and month-year tracking queries.
- Outputs: category/goal entities and tracking summaries.
- Guards: ownership checks exist but depend on legacy relations.

### Current failure modes
- Services assume category-table taxonomy (`finance_categories`) instead of unified tags.
- Route-level composition is too broad and expensive.

### Modernization review
- Selected modern contract: explicit budget aggregates over canonical transactions + shared tags model.

### Final target contract
- Tag-driven budget and goal command/query surfaces with strict DTOs.
- Tracking summary computed via reusable aggregate query functions.

### Required RED tests
- Tag assignment idempotency per transaction and owner.
- Goal lifecycle validation.
- Tracking summary deterministic for fixed fixtures.

### Required GREEN tasks
- Rewrite budget services on tag-driven schema contract.
- Route simplification to thin adapters.

### Legacy files/imports to delete
- `finance_categories`-dependent finance classification paths and old aggregate helpers.

### Execution status
- FIN-03 category/tracking baseline is now DB-backed on modern schema in `packages/finance/src/modern-finance.ts`:
  - category lifecycle: `createBudgetCategory`, `updateBudgetCategory`, `deleteBudgetCategory`, `getBudgetCategoryById`
  - category queries: `getSpendingCategories`, `getAllBudgetCategories`, `checkBudgetCategoryNameExists`, `getUserExpenseCategories`
  - tracking queries: `getBudgetCategoriesWithSpending`, `getBudgetTrackingData`
- `getBudgetTrackingData` includes an environment-safe guard for test DB variants that have not provisioned `budget_goals` yet; spent totals remain deterministic from `finance_transactions`.
- DB-backed RED→GREEN integration suite added and green:
  - `packages/finance/src/modern-finance.budget.integration.test.ts` (3 passing tests)
- This FIN-03 baseline is transitional and will be replaced by the next phase tag-driven contract in this active change.

## FIN-04 Analytics (Tag, Time Series, Merchant)
### Capability ID and entry points
- ID: `FIN-04`
- Entry points:
  - `packages/finance/src/finance.analytics.service.ts`
  - `packages/finance/src/analytics/*`
  - `packages/hono-rpc/src/routes/finance.analyze.ts`

### Current inputs/outputs + guards
- Inputs: analysis query options/date ranges.
- Outputs: tag breakdown, timeseries, top merchants.
- Guards: user scoping depends on underlying query functions.

### Current failure modes
- Multiple analytics paths with overlapping logic.
- Potential repeated scans for similar datasets.

### Modernization review
- Selected modern contract: shared analytics query core with reusable windowed datasets.

### Final target contract
- Single query core for analysis datasets.
- Derived analytics computed from common normalized dataset.

### Required RED tests
- Tag/month/merchant outputs match fixture expectations.
- Date-window filters enforce boundaries.
- No cross-tenant analytics leakage.

### Required GREEN tasks
- Consolidate analytics query core.
- Remove duplicated aggregation pipelines.

### Legacy files/imports to delete
- Redundant aggregation paths duplicating base query work.

### Execution status
- FIN-04 analytics consolidation is completed on the modern finance service layer:
  - shared analytics dataset/query core:
    - `queryAnalyticsTransactionsByContract`
  - shared derived analytics calculators:
    - `getTagBreakdownByContract`
    - `getTopMerchantsByContract`
    - `getMonthlyStatsByContract`
    - `getSpendingTimeSeriesByContract`
  - legacy route-local aggregation logic removed from transport path:
    - `packages/hono-rpc/src/routes/finance.analyze.ts` now delegates to shared service-layer analytics contracts
  - tag-breakdown transport payload is tag-first:
    - breakdown item key is now `tag` (not `category`)
  - monthly analytics transport payload is tag-first:
    - `topTag` (replaces `topCategory`)
    - `tagSpending` (replaces `categorySpending`)
  - residual legacy analytics branch deleted to enforce no-shim contract:
    - `packages/finance/src/finance.analytics.service.ts`
    - `packages/finance/src/analytics/aggregation.service.ts`
    - `packages/finance/src/analytics/analytics.utils.ts`
    - `packages/finance/src/analytics/time-series.service.ts`
    - `packages/finance/src/analytics/transaction-analytics.service.ts`
  - analytics UI tag-listing route aligned to canonical breakdown contract:
    - `apps/finance/app/routes/analytics.tags.tsx` now consumes `TagBreakdownOutput.breakdown` entries (`tag`, `amount`, `transactionCount`) directly
    - route sorting/filtering and deep links are now tag-first (no legacy `category/total/count` shape assumptions)
  - symbol naming cleanup applied in analytics surfaces:
    - finance app hook renamed to `useTagBreakdown` (`apps/finance/app/lib/hooks/use-analytics.ts`)
    - analytics summary component renamed to `TopTags` export (`apps/finance/app/components/analytics/top-tags.tsx`)
    - RPC analytics types renamed from `CategoryBreakdown*` to `TagBreakdown*` (`packages/hono-rpc/src/types/finance/analytics.types.ts`)
- existing analytics aggregate and bootstrap functions remain DB-backed:
  - `getTagBreakdown`
  - `getTopMerchants`
  - `getTransactionTagAnalysis`
  - `bulkCreateBudgetCategoriesFromTransactions`
- DB-backed RED→GREEN coverage expanded and green:
  - `packages/finance/src/modern-finance.analytics.integration.test.ts` (2 passing tests)
  - `packages/finance/src/modern-finance.budget.integration.test.ts` (3 passing tests)
  - `services/api/src/routes/finance/finance.transactions.router.test.ts` (6 passing tests, includes analyze endpoints)

## FIN-08 Finance Taxonomy Schema Rewrite (Next Phase, Locked)
### Capability ID and entry points
- ID: `FIN-08`
- Entry points:
  - `packages/finance/src/contracts.ts`
  - `packages/db/src/schema/tags.ts`
  - `packages/db/src/schema/finance.ts`
  - `packages/db/src/migrations/<next_finance_tags_phase>.sql`
  - `packages/db/src/services/tags.service.ts`
  - `packages/finance/src/modern-finance.ts`
  - `packages/hono-rpc/src/schemas/finance*.schema.ts`
  - `packages/hono-rpc/src/routes/finance.transactions.ts`
  - `packages/hono-rpc/src/routes/finance.tags.ts` (replace legacy category route)
  - `services/api/src/routes/finance/finance.tags.ts` (replace legacy category route)

### Final target contract
- Finance taxonomy is entirely tag-driven.
- `finance_categories` is not used for classification/filtering.
- Finance transaction query/filter APIs support tag criteria as first-class filters.
- Budget/analytics contract is tag-based.

### Required RED tests
- Transaction tag assignment/replacement idempotency and owner scoping.
- Tag-filtered transaction query determinism (stable order + pagination).
- Tag-based analytics/budget aggregates determinism.
- Cross-tenant tag leakage rejection.

### Required GREEN tasks
- Remove `finance_categories` dependency from finance service and route contracts.
- Rewrite finance classification, filters, analytics, and budget logic to shared tags.
- Delete finance category-specific legacy files and route surfaces in same phase.

### Legacy files/imports to delete
- `finance_categories`-driven finance contract and route surfaces.
- Category-specific finance DTOs preserved only for compatibility.

### Execution status
- FIN-08 phase has started with tag-driven contract foundation:
  - canonical finance contracts added at `packages/finance/src/contracts.ts`
  - finance transaction entity-type lock defined for shared tagging (`finance_transaction`)
- modern finance service now exposes tag-driven transaction APIs:
  - `queryTransactionsByContract` with tag filters (`tagIds`/`tagNames`)
  - `replaceTransactionTags` (idempotent replacement)
  - `getTransactionTagIds`
- modern finance service category/taxonomy paths have been cut over to shared tags:
  - `getSpendingCategories`, `getAllBudgetCategories`, `createBudgetCategory`, `updateBudgetCategory`, `deleteBudgetCategory`, `getBudgetCategoryById`, `checkBudgetCategoryNameExists`
  - `getBudgetCategoriesWithSpending` now computes spending from `tags` + `tagged_items` + `finance_transactions`
  - `getTagBreakdown` now aggregates by tags, not `finance_transactions.category` text
  - `deleteAllFinanceData` removes finance transaction tag links and no longer depends on `finance_categories`
- transport/schema cutover progress:
  - `packages/hono-rpc/src/schemas/finance.transactions.schema.ts` now includes tag-driven query filters (`tagIds`/`tagNames`) and tag IDs on transaction insert contracts
  - `services/api/src/routes/finance/finance.tags.ts` now resolves tag-driven taxonomy via `getTransactionTags`
  - legacy category transport surfaces deleted and replaced with tag surfaces:
    - `packages/hono-rpc/src/routes/finance.categories.ts` -> `packages/hono-rpc/src/routes/finance.tags.ts`
    - `services/api/src/routes/finance/finance.categories.ts` -> `services/api/src/routes/finance/finance.tags.ts`
    - finance app hook now uses `client.api.finance.tags.list.$post`
  - `packages/hono-rpc/src/routes/finance.transactions.ts` now serves:
    - `POST /finance/transactions/list` on tag-driven query contract
    - `POST /finance/transactions/create`
    - `POST /finance/transactions/update`
    - `POST /finance/transactions/delete`
  - create/update transaction transport now supports optional tag replacement through `replaceTransactionTags`
  - analyze transport input contracts are now tag-first (no compatibility remap):
    - `packages/hono-rpc/src/routes/finance.analyze.ts` now validates `tag` input for:
      - `POST /finance/analyze/tag-breakdown`
      - `POST /finance/analyze/top-merchants`
      - `POST /finance/analyze/spending-time-series`
    - `packages/hono-rpc/src/types/finance/analytics.types.ts` input types renamed `category` -> `tag`
    - finance app analytics hooks now send `tag` directly in request payloads
  - analytics UX routes are now tag-first:
    - `/analytics/category/:category` replaced by `/analytics/tag/:tag`
    - `/analytics/categories` replaced by `/analytics/tags`
    - finance app route file moved to `apps/finance/app/routes/analytics.tag.$tag.tsx`
    - finance analytics listing route file moved to `apps/finance/app/routes/analytics.tags.tsx`
    - deep links from analytics breakdown now navigate to `/analytics/tag/<tag>`
    - monthly breakdown links now carry `?tag=<tag>` query params
- DB-backed integration suite added and green:
  - `packages/finance/src/modern-finance.tags.integration.test.ts` (2 passing tests)
  - verifies owner-scoped tag replacement, idempotency, tag-filtered query behavior, and cross-tenant rejection
- transport integration suite added and green:
  - `services/api/src/routes/finance/finance.transactions.router.test.ts` (6 passing tests)
  - verifies authenticated `create/list/update/delete` handlers, tag-filtered transaction listing, `/api/finance/tags` taxonomy reads, and analyze endpoints (`tag-breakdown`, `top-merchants`, `spending-time-series`)
- schema/migration cutover completed:
  - `packages/db/src/migrations/schema.ts` no longer defines `finance_categories`
  - `packages/db/src/migrations/relations.ts` no longer defines `financeCategories` relations
  - Drizzle custom migration added: `packages/db/src/migrations/0005_finance_tags_taxonomy_rewrite.sql`
    - drops `finance_categories`
    - removes legacy `category_id` transaction indexes
    - adds tag-driven transaction read indexes for finance query paths
  - test DB migrated with the new migration:
    - `bun run --filter @hominem/db db:migrate:test`
- no-shim cleanup completed for residual category branches:
  - deleted `packages/finance/src/core/budget-categories.service.ts`
  - deleted `packages/finance/src/core/budget-tracking.service.ts`
  - deleted `packages/finance/src/core/budget-analytics.service.ts`
  - deleted `packages/finance/src/finance.tool-servers.ts`
  - deleted `packages/finance/src/budget.test.ts`
- Remaining FIN-08 work:
  - budget-domain naming (`budget categories`) is still present by design; analytics and transport naming is fully tag-first

## FIN-05 Plaid And Institution Synchronization
### Capability ID and entry points
- ID: `FIN-05`
- Entry points:
  - `packages/finance/src/plaid.service.ts`
  - `packages/finance/src/core/institutions.repository.ts`
  - `packages/finance/src/core/institution.service.ts`
  - `packages/hono-rpc/src/routes/finance.plaid.ts`
  - `packages/hono-rpc/src/routes/finance.institutions.ts`
  - `services/api/src/routes/finance/plaid/*`

### Current inputs/outputs + guards
- Inputs: link token/exchange/sync/remove commands.
- Outputs: plaid item/account sync status and institution views.
- Guards: ownership checks partial, relation symbols outdated.

### Current failure modes
- Missing `plaidItems`/`financialInstitutions` relations in current schema surface.
- Sync/update paths can diverge between API and RPC surfaces.

### Modernization review
- Selected modern contract: plaid orchestration service decoupled from route transport, using only current schema entities.

### Final target contract
- Unified plaid command handlers:
  - create link token
  - exchange token
  - sync item
  - remove connection
- Institution lookups through explicit repository contract.

### Required RED tests
- User A cannot mutate user B plaid connection.
- Sync failures return deterministic error envelope.
- Remove connection is idempotent.

### Required GREEN tasks
- Rebuild plaid + institution services on redesigned schema.
- Ensure API and RPC call same service layer.

### Legacy files/imports to delete
- Legacy table/relation references and route-specific sync logic.

### Execution status
- FIN-05 partial implementation is active in `packages/finance/src/modern-finance.ts`:
  - plaid lookup APIs are now DB-backed:
    - `getPlaidItemByUserAndItemId`
    - `getPlaidItemById`
    - `getPlaidItemByItemId`
  - plaid mutation APIs are DB-backed:
    - `upsertPlaidItem`
    - `updatePlaidItemStatusByItemId`
    - `updatePlaidItemStatusById`
    - `updatePlaidItemCursor`
    - `updatePlaidItemSyncStatus`
    - `updatePlaidItemError`
    - `deletePlaidItem`
  - institution APIs are DB-backed:
    - `getAllInstitutions`
    - `createInstitution`
    - `ensureInstitutionExists`
- integration suite added at `packages/finance/src/modern-finance.plaid.integration.test.ts`:
  - suite now runs unconditionally when DB is reachable and enforces table presence as part of setup
  - current gate status: 3/3 passing (owner guard, status/cursor updates, idempotent delete)
- FIN-05 transport hardening completed on canonical finance RPC routes:
  - `packages/hono-rpc/src/routes/finance.accounts.ts` now serves:
    - `POST /finance/accounts/list`
    - `POST /finance/accounts/get`
    - `POST /finance/accounts/create`
    - `POST /finance/accounts/update`
    - `POST /finance/accounts/delete`
    - `POST /finance/accounts/with-plaid`
    - `POST /finance/accounts/connections`
    - `POST /finance/accounts/institution-accounts`
    - `POST /finance/accounts/all`
  - `packages/hono-rpc/src/routes/finance.institutions.ts` now serves:
    - `POST /finance/institutions/list`
    - `POST /finance/institutions/create`
  - `packages/hono-rpc/src/routes/finance.plaid.ts` now serves:
    - `POST /finance/plaid/create-link-token`
    - `POST /finance/plaid/exchange-token`
    - `POST /finance/plaid/sync-item`
    - `DELETE /finance/plaid/remove-connection`
- FIN-05 API integration slice added and green:
  - `services/api/src/routes/finance/finance.accounts.router.test.ts` (4 passing tests)
  - verifies account CRUD owner scoping, institutions list/create, plaid exchange/sync/remove lifecycle, and auth rejection
- schema provisioning completed for FIN-05 runtime dependencies:
  - `packages/db/src/migrations/0006_finance_runtime_tables.sql`:
    - creates `financial_institutions`
    - creates `plaid_items` with owner guard indexes/constraints
    - creates tag-driven `budget_goals`
  - `packages/db/src/migrations/0007_budget_goals_nullable_category_id.sql`:
    - aligns budget-goal contract by allowing nullable `category_id`
- verification evidence:
  - `bun run --filter @hominem/db db:migrate:test` (passes with 0006 + 0007 applied)
  - `bun run --filter @hominem/finance-services test` (14 passing integration tests, 0 skipped)

## FIN-06 Runway And Calculators
### Capability ID and entry points
- ID: `FIN-06`
- Entry points:
  - `packages/finance/src/core/runway.service.ts`
  - `packages/finance/src/finance.calculators.service.ts`
  - `packages/hono-rpc/src/routes/finance.runway.ts`

### Current inputs/outputs + guards
- Inputs: cashflow projection and calculator payloads.
- Outputs: projection/calculator result DTOs.
- Guards: pure computation mostly safe, input contract fragmentation exists.

### Current failure modes
- Validation schemas duplicated between service and route.
- Inconsistent numeric normalization.

### Modernization review
- Selected modern contract: computation services as pure functions + shared schema gateway.

### Final target contract
- One schema source per calculator input/output.
- Deterministic numeric/string normalization.

### Required RED tests
- Projection/calculation correctness for known fixtures.
- Validation rejects invalid edge inputs.

### Required GREEN tasks
- Centralize calculator schema definitions.
- Keep compute layer pure and side-effect free.

### Legacy files/imports to delete
- Duplicated schema declarations across transport layers.

### Execution status
- FIN-06 implementation completed on shared modern contract:
  - calculator schemas/functions centralized in `packages/finance/src/modern-finance.ts`:
    - `calculateBudgetBreakdownInputSchema` + `calculateBudgetBreakdown`
    - `calculateSavingsGoalInputSchema` + `calculateSavingsGoal`
    - `calculateLoanDetailsInputSchema` + `calculateLoanDetails`
    - `runwayCalculationSchema` + `calculateRunway`
  - compatibility surface now re-exports from centralized contract:
    - `packages/finance/src/finance.calculators.service.ts`
  - transport layer now uses the same shared schema/function sources:
    - `packages/hono-rpc/src/routes/finance.runway.ts`
      - `POST /finance/runway/calculate`
      - `POST /finance/runway/budget-breakdown`
      - `POST /finance/runway/savings-goal`
      - `POST /finance/runway/loan-details`
- RED→GREEN coverage added:
  - `packages/finance/src/modern-finance.calculators.integration.test.ts` (3 passing tests)
  - `services/api/src/routes/finance/finance.data.router.test.ts`
    - validates runway calculator transport with numeric normalization
    - validates auth requirement on protected data-op endpoints

## FIN-07 Import/Export/Cleanup
### Capability ID and entry points
- ID: `FIN-07`
- Entry points:
  - `packages/finance/src/cleanup.service.ts`
  - `services/api/src/routes/finance/finance.import.ts`
  - `packages/hono-rpc/src/routes/finance.export.ts`
  - `packages/hono-rpc/src/routes/finance.data.ts`

### Current inputs/outputs + guards
- Inputs: import job parameters, export params, delete-all command.
- Outputs: job state, exported data, delete confirmation.
- Guards: user scoping exists but job consistency contracts are not unified.

### Current failure modes
- Import/export boundaries differ between API and RPC paths.
- Cleanup can be broad without explicit dry-run/confirm semantics.

### Modernization review
- Selected modern contract: explicit `DataOpsService` with command DTOs and auditable outcomes.

### Final target contract
- `startImport`, `getImportJob`, `exportData`, `deleteAllData`
- Explicit user scope and operation result metadata.

### Required RED tests
- Unauthorized data-op commands denied.
- Delete-all affects only caller scope.
- Import job state transitions deterministic.

### Required GREEN tasks
- Consolidate data ops orchestration.
- Harmonize API and RPC result envelopes.

### Legacy files/imports to delete
- Duplicate transport-specific data-op orchestration logic.

### Execution status
- FIN-07 data-ops orchestration completed on modern shared service layer:
  - `packages/finance/src/modern-finance.ts` now exposes:
    - `exportFinanceData(userId)` scoped export envelope
    - `deleteAllFinanceDataWithSummary(userId)` scoped delete summary
    - `deleteAllFinanceData(userId)` delegates to summary path
  - transport cutover completed:
    - `packages/hono-rpc/src/routes/finance.export.ts`
      - `POST /finance/export/all`
    - `packages/hono-rpc/src/routes/finance.data.ts`
      - `POST /finance/data/delete-all` (explicit `confirm: true` contract)
- RED→GREEN coverage added:
  - `packages/finance/src/modern-finance.data-ops.integration.test.ts` (2 passing tests)
    - export is caller-scoped
    - delete-all only deletes caller-scoped data and returns deterministic summary
  - `services/api/src/routes/finance/finance.data.router.test.ts` (4 passing tests)
    - authenticated export path
    - authenticated delete-all path
    - auth rejection (401)
    - invalid delete-all payload rejection (400)
