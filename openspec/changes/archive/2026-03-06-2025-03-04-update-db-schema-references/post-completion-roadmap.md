# Post-Completion Roadmap (After `update-db-schema-references`)

## Purpose
Define what happens immediately after this change is complete, archived, and merged so momentum does not stall and architecture quality remains high.

## Entry Criteria
This roadmap starts only after all of the following are true:
- `tasks.md` checklist is fully reconciled with real gate evidence
- Final gates are green:
  - `bun run validate-db-imports`
  - `bun run test`
  - `bun run --filter @hominem/hono-rpc typecheck`
  - `bun run check`
- No-shim policy is satisfied (no legacy aliases/wrappers/dual-path logic)
- Change is archived via OpenSpec workflow

## Phase 1: Stabilization Freeze (Day 0-2)
1. Create a short-lived stabilization window for this merged architecture baseline.
2. Allow only bug fixes and regressions related to the cutover.
3. Block net-new feature surface changes in refactored modules during this window.
4. Track and resolve:
   - Type regressions
   - Runtime route regressions
   - Cross-tenant/authorization defects
   - Query and pagination determinism defects

## Phase 2: Operational Baseline Capture (Day 1-3)
1. Capture performance and reliability baselines from CI and local repeatable runs:
   - `bun run typecheck` median
   - `@hominem/db` extended diagnostics snapshot
   - test runtime medians for touched packages
2. Persist baseline artifact in repo docs:
   - `openspec/changes/archive/<archived-change>/verification-baseline.md`
3. Record thresholds for alerting on regression in follow-up changes:
   - Typecheck regression threshold
   - Test runtime regression threshold
   - Key route latency threshold for finance/notes/calendar paths

## Phase 3: Cross-Module Contract Lock (Day 2-4)
1. Freeze canonical service contracts in each modernized module package.
2. Add explicit compatibility policy:
   - breaking contract changes require a new OpenSpec proposal
   - no compatibility shims allowed in consumers
3. Enforce with lightweight guard scripts:
   - import-boundary checks
   - no-shim grep checks
   - route path contract checks for renamed endpoints

## Phase 4: Test Architecture Hardening (Day 3-6)
1. Continue integration-first testing as the primary strategy.
2. Consolidate reusable integration scaffolding to prevent duplication:
   - DB fixture builders
   - auth/session setup
   - shared contract assertions
3. Add package-level testing standards doc:
   - when to write integration tests
   - when a narrow unit test is acceptable
   - deterministic dataset and seed rules
4. Introduce flake tracking:
   - mark flaky suites
   - prioritize deterministic rewrites

## Phase 5: Follow-up Change Queue (Next Proposal Set)
Create the next proposal set with strict dependency ordering:
1. Observability hardening for modern service boundaries
   - structured logs
   - service-level metrics
   - error taxonomy dashboards
2. Data lifecycle and retention policy hardening
   - archival strategy
   - delete-all safety/confirmation policy normalization
3. Query plan optimization pass on high-volume paths
   - finance analytics reads
   - notes/chat history reads
   - calendar list windows
4. Auth boundary audit pass across all RPC surfaces
   - tenant scoping invariants
   - object-level authorization invariants

## Phase 6: Rollout + Ownership
1. Assign clear owners for each modern module:
   - auth, chat, notes, calendar, lists, places, finance
2. Define on-call escalation path for cutover regressions.
3. Publish one-page operational runbook for common incidents:
   - failing schema expectations in test DB
   - route contract mismatch
   - stale generated type artifacts

## Non-Negotiables
- No reintroduction of legacy modules, symbols, or adapter layers.
- No direct app imports from `@hominem/db` internals.
- No TODO-only test placeholders; new behavior must be RED->GREEN with real tests.
- Keep service functions small, deterministic, and transaction-safe.

## Completion Signal For This Roadmap
This roadmap is complete when:
1. Stabilization window closes with no unresolved P0/P1 regressions.
2. Baseline artifacts are captured and committed.
3. Follow-up proposals are opened with explicit owners and order.
4. Module ownership and incident runbook are published.
