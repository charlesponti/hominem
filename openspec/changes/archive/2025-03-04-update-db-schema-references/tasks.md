## 1. Blueprint Finalization (Docs-First)

- [x] 1.1 Freeze service file list and export names from `design.md`
- [x] 1.2 Freeze method signatures for all services from `design.md`
- [x] 1.3 Freeze finance partition handling contract (`date + id` point ops)
- [x] 1.4 Freeze test blueprint and required test cases per service
- [x] 1.5 Freeze root index contract: infra exports only, no service exports
- [x] 1.6 Freeze update DTO rule: no public `Partial<$inferInsert>` signatures
- [x] 1.7 Freeze error taxonomy and API error mapping contract
- [x] 1.8 Freeze query contract (pagination/sort/filter DTOs)
- [x] 1.9 Freeze transaction + idempotency policy for multi-table writes
- [x] 1.10 Freeze data normalization contract (numeric/date/json)
- [x] 1.11 Freeze shared ID branding utility contract

## 2. Baseline Performance Capture (Pre-Implementation)

- [x] 2.1 Clear turbo cache, run baseline `bun run typecheck` 3x, record median
- [x] 2.2 Capture baseline `bun run --filter @hominem/db typecheck -- --extendedDiagnostics`
- [x] 2.3 Capture baseline tsserver scenario logs with `TSS_LOG` and record median request latency

## 3. Guardrails and Shared Test Infrastructure

- [x] 3.1 Extend `scripts/validate-db-imports.js` with DB-service rule: forbid imports from `packages/db/src/migrations/schema.ts` within `packages/db/src/services/**`
- [x] 3.2 Extend `scripts/validate-db-imports.js` with wrapper rule: forbid `packages/db/src/schema/*.ts` re-export wrappers pointing to `migrations/schema.ts`
- [x] 3.3 Add tests or fixture-based checks for the new validation script rules
- [x] 3.4 Create shared DB service test helpers in `packages/db/src/test/services/_shared/` (seed builders, user factories, assertion helpers)
- [x] 3.5 Create shared RED-GREEN test conventions for service tests (real assertions only, no placeholder tests)
- [x] 3.6 Implement shared ID branding utilities in `packages/db/src/services/_shared/ids.ts`
- [x] 3.7 Implement shared error utilities/contracts in `packages/db/src/services/_shared/errors.ts`
- [x] 3.8 Implement shared query DTO utilities (`limit/cursor/sort`) in `packages/db/src/services/_shared/query.ts`
- [x] 3.9 Implement shared test isolation utilities (transaction rollback/reset + frozen clock helpers)

## 4. Service Scaffolding (`@hominem/db`)

- [x] 4.1 Create schema-slice generator script at `scripts/generate-db-schema-slices.ts`
- [x] 4.2 Generator input: `packages/db/src/migrations/schema.ts`
- [x] 4.3 Generator outputs: `packages/db/src/schema/tasks.ts`, `tags.ts`, `calendar.ts`, `persons.ts`, `bookmarks.ts`, `possessions.ts`, `finance.ts`
- [x] 4.4 Enforce output rule: generated domain files must not import from `packages/db/src/migrations/schema.ts`
- [x] 4.5 Add package script (root `package.json`) to regenerate schema slices deterministically
- [x] 4.6 Run generator and commit generated schema slice files
- [x] 4.7 Configure `@hominem/db` package exports/types for `@hominem/db/services/*` subpaths
- [x] 4.8 Update monorepo TS path mappings for `@hominem/db/services/*` resolution
- [x] 4.9 Add subpath import smoke file in API layer to validate editor/build resolution (typed compile only)
- [x] 4.10 Add CI drift check: run schema-slice generator and fail if git diff is non-empty

## 5. RED-GREEN Service Implementation (`@hominem/db`)

- [x] 5.1 Tasks service RED tests
- [x] 5.2 Tasks service GREEN implementation (`packages/db/src/services/tasks.service.ts`)
- [x] 5.3 Tags service RED tests
- [x] 5.4 Tags service GREEN implementation (`packages/db/src/services/tags.service.ts`)
- [x] 5.5 Calendar service RED tests
- [x] 5.6 Calendar service GREEN implementation (`packages/db/src/services/calendar.service.ts`)
- [x] 5.7 Persons service RED tests
- [x] 5.8 Persons service GREEN implementation (`packages/db/src/services/persons.service.ts`)
- [x] 5.9 Bookmarks service RED tests
- [x] 5.10 Bookmarks service GREEN implementation (`packages/db/src/services/bookmarks.service.ts`)
- [x] 5.11 Possessions service RED tests
- [x] 5.12 Possessions service GREEN implementation (`packages/db/src/services/possessions.service.ts`)
- [x] 5.13 Finance categories service RED tests
- [x] 5.14 Finance categories service GREEN implementation (`packages/db/src/services/finance/categories.service.ts`)
- [x] 5.15 Finance accounts service RED tests
- [x] 5.16 Finance accounts service GREEN implementation (`packages/db/src/services/finance/accounts.service.ts`)
- [x] 5.17 Finance transactions service RED tests
- [x] 5.18 Finance transactions service GREEN implementation (`packages/db/src/services/finance/transactions.service.ts`)
- [x] 5.19 Add transaction boundaries to all replace/multi-table write methods per policy
- [x] 5.20 Ensure idempotency tests pass for replace/upsert style methods

## 6. Index and Package Cutover

- [x] 6.1 Update `packages/db/src/index.ts` to infra exports only (`db`, `getDb`, helpers)
- [x] 6.2 Ensure no type re-exports from package root index
- [x] 6.3 Update imports in API layer to explicit service subpaths

## 7. API Layer Rebuild (`services/api`)

- [x] 7.1 Update handlers to call new service functions/signatures
- [x] 7.2 Validate external inputs with Zod at route boundaries
- [x] 7.3 Apply branded ID casting only after successful validation
- [x] 7.4 Confirm authN/authZ checks across sensitive routes
- [x] 7.5 Add API tests: success, validation failure, unauthorized/forbidden, not-found

## 8. RPC Layer Rebuild (`packages/hono-rpc`)

- [x] 8.1 Update RPC schemas/types to match API payloads
- [x] 8.2 Remove stale endpoint/type references
- [x] 8.3 Verify downstream app typecheck compatibility

## 9. App Layer Cutover (RPC-only)

- [x] 9.1 Update all app data access to `@hominem/hono-client`
- [x] 9.2 Remove forbidden app imports from `@hominem/db` and DB schema/types
- [x] 9.3 Validate key UI read/write flows through RPC endpoints

## 10. Legacy Cleanup

- [x] 10.1 Remove root-level legacy `*.service.ts` files once API/RPC/app cutover is complete
- [x] 10.2 Add repo-wide check: no remaining imports from legacy root-level DB services

## 11. Cross-Cutting Decisions

- [x] 11.1 Decide `vector_documents`: add schema support or remove feature
- [x] 11.2 Decide `financial_institutions` and `plaid_items`: add schema support or remove feature

## 12. Repo Gates and Post-Change Performance

- [x] 12.1 `bun run validate-db-imports`
- [x] 12.2 `bun run test` (touched packages)
- [x] 12.3 `bun run check` (repo root)
- [x] 12.4 Clear turbo cache, run post-change `bun run typecheck` 3x, record median
- [x] 12.5 Capture post-change `bun run --filter @hominem/db typecheck -- --extendedDiagnostics`
- [x] 12.6 Verify incremental typecheck regression <=10% versus baseline (Section 2) and fail gate if exceeded
- [x] 12.7 Run consumer package typecheck that imports `@hominem/db/services/*` (e.g., `services/api`) to validate package subpath resolution in CI
- [x] 12.8 Capture post-change tsserver scenario logs and compute median request latency regression (<=10%) versus baseline (Section 2)
- [x] 12.9 Attach diagnostics artifacts (typecheck timings, extended diagnostics, tsserver latency summary) to change notes
- [x] 12.10 Verify CI drift gate passes for generated schema slices
- [x] 12.11 Verify error mapping tests pass (`Validation/NotFound/Conflict/Forbidden/Internal`)
- [x] 12.12 Verify query contract tests pass (limit bounds, cursor stability, deterministic sorting)
