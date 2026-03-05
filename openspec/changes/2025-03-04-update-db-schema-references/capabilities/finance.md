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

## FIN-03 Budget Categories/Goals/Tracking
### Capability ID and entry points
- ID: `FIN-03`
- Entry points:
  - `packages/finance/src/core/budget-categories.service.ts`
  - `packages/finance/src/core/budget-goals.service.ts`
  - `packages/finance/src/core/budget-tracking.service.ts`
  - `packages/hono-rpc/src/routes/finance.budget.ts`

### Current inputs/outputs + guards
- Inputs: budget category/goal operations and month-year tracking queries.
- Outputs: category/goal entities and tracking summaries.
- Guards: ownership checks exist but depend on legacy relations.

### Current failure modes
- Services assume old budget tables/relations.
- Route-level composition is too broad and expensive.

### Modernization review
- Selected modern contract: explicit budget aggregates over canonical transactions/categories tables only.

### Final target contract
- Category and goal command/query surfaces with strict DTOs.
- Tracking summary computed via reusable aggregate query functions.

### Required RED tests
- Category uniqueness per user.
- Goal lifecycle validation.
- Tracking summary deterministic for fixed fixtures.

### Required GREEN tasks
- Rewrite budget services on new schema.
- Route simplification to thin adapters.

### Legacy files/imports to delete
- Legacy budget relation imports and old aggregate helpers.

## FIN-04 Analytics (Category, Time Series, Merchant)
### Capability ID and entry points
- ID: `FIN-04`
- Entry points:
  - `packages/finance/src/finance.analytics.service.ts`
  - `packages/finance/src/analytics/*`
  - `packages/hono-rpc/src/routes/finance.analyze.ts`

### Current inputs/outputs + guards
- Inputs: analysis query options/date ranges.
- Outputs: category breakdown, timeseries, top merchants.
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
- Category/month/merchant outputs match fixture expectations.
- Date-window filters enforce boundaries.
- No cross-tenant analytics leakage.

### Required GREEN tasks
- Consolidate analytics query core.
- Remove duplicated aggregation pipelines.

### Legacy files/imports to delete
- Redundant aggregation paths duplicating base query work.

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
