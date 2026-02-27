# Tasks: Remove Explicit Any Usage

**Input**: Design documents from `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not adding new tests unless required; update existing tests to remove explicit `any`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish guardrails and inventory scope for the cleanup

- [x] T001 Document current `any`/`as any` inventory in `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/research.md`
- [x] T002 [P] Add no-explicit-any lint enforcement in `/Users/charlesponti/Developer/hominem/.oxlintrc.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared types and guards that multiple stories depend on

- [x] T003 Define shared guard utilities in `/Users/charlesponti/Developer/hominem/packages/utils/src/data/normalization.ts`
- [x] T004 [P] Define markdown AST node types in `/Users/charlesponti/Developer/hominem/packages/utils/src/markdown/markdown-processor.ts`
- [x] T005 [P] Define retry logger type in `/Users/charlesponti/Developer/hominem/packages/utils/src/retry.ts`
- [x] T006 [P] Define server env typing helpers in `/Users/charlesponti/Developer/hominem/packages/env/src/create-server-env.ts`
- [x] T007 [P] Define client env typing helpers in `/Users/charlesponti/Developer/hominem/packages/env/src/create-client-env.ts`

**Checkpoint**: Shared typing utilities exist to support downstream refactors.

---

## Phase 3: User Story 1 - Strictly Typed Codebase (Priority: P1) 🎯 MVP

**Goal**: Remove all explicit `any`/`as any` usage across apps, packages, services, and tools.

**Independent Test**: `rg "as\\s+any|\\bany\\b" apps packages services tools` yields zero matches and `bun run typecheck` passes.

### Implementation for User Story 1 (Apps)

- [x] T008 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/accounts/account-header.tsx`
- [x] T009 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/accounts/account-spending-chart.tsx`
- [x] T010 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/analytics-chart-display.tsx`
- [x] T011 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/analytics-filters.tsx`
- [x] T012 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/top-categories.tsx`
- [x] T013 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/top-merchants.tsx`
- [x] T014 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/budget-overview.tsx`
- [x] T015 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/budget-categories/budget-category-details.tsx`
- [x] T016 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/budget-categories/budget-projection-dashboard.tsx`
- [x] T017 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/routes/accounts.tsx`
- [x] T018 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/routes/accounts.$id.tsx`
- [x] T019 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/routes/analytics.monthly.$month.tsx`
- [x] T020 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/routes/budget.impact.tsx`
- [x] T021 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/routes/budget.categories.setup.tsx`
- [x] T022 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/lib/hooks/use-finance-data.ts`
- [x] T023 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/lib/hooks/use-time-series.ts`
- [x] T024 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/finance/app/lib/hooks/use-shared-state-examples.ts`

- [x] T025 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/routes/lists.$id.tsx`
- [x] T026 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/routes/lists.$id.invites.sent.tsx`
- [x] T027 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/routes/visits.tsx`
- [x] T029 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/places/PlaceLists.tsx`
- [x] T030 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/places/PeopleMultiSelect.tsx`
- [x] T031 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/places/places-autocomplete.tsx`
- [x] T033 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/lists/lists.tsx`
- [x] T034 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/lists/add-place-control.tsx`
- [x] T035 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/trips/add-place-to-trip-modal.tsx`
- [x] T036 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/components/RouteErrorBoundary.tsx`
- [x] T037 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/lib/api/provider.tsx`
- [x] T038 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/lib/query-keys.ts`
- [x] T039 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/rocco/app/lib/hooks/use-user.ts`

- [x] T040 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/apps/notes/app/lib/hooks/use-mutation-with-optimistic.ts`

### Implementation for User Story 1 (Packages / Services / Tools)

- [x] T041 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-client/src/core/transformer.ts`
- [x] T042 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/client.ts`
- [x] T043 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/lists.query.ts`
- [x] T044 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/lists.mutation.ts`
- [x] T045 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/items.ts`
- [x] T046 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/trips.ts`
- [x] T047 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/invites.ts`
- [x] T048 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/finance.budget.ts`
- [x] T049 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/places.ts`
- [x] T050 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/chats.ts`

- [x] T051 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/twitter.types.ts`
- [x] T052 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/budget.types.ts`
- [x] T053 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/hono-rpc/src/types/finance/plaid.types.ts`

- [x] T054 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/db/src/client.ts`
- [x] T055 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/db/src/schema/calendar-events.schema.ts`

- [x] T056 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/queues.ts`
- [x] T057 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/vector.service.ts`
- [x] T058 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/typing-mind.schema.ts`
- [x] T059 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/boltai.schema.ts`
- [x] T060 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/openai-export.schema.ts`

- [x] T061 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/events/src/events.service.ts`
- [x] T062 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/finance/src/finance.transactions.service.ts`
- [x] T063 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/finance/src/features/accounts/accounts.domain.ts`
- [x] T064 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/packages/notes/src/types.ts`

- [x] T065 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/services/api/src/server.ts`
- [x] T066 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/services/workers/src/place-photo-worker.ts`

- [x] T067 [P] [US1] Replace `any` usage in `/Users/charlesponti/Developer/hominem/tools/cli/src/commands/ai/invoke.ts`

**Checkpoint**: Explicit `any` removed from all production and tooling code.

---

## Phase 4: User Story 2 - Typed API and UI Data Flow (Priority: P2)

**Goal**: Ensure API responses and UI data flows use explicit shared types and schema-derived types.

**Independent Test**: Key API hooks and mapping layers use named types from `@hominem/hono-rpc/types` or schema-derived types with Zod.

### Implementation for User Story 2

- [x] T068 [P] [US2] Replace finance hook response types with exported contracts in `/Users/charlesponti/Developer/hominem/apps/finance/app/lib/hooks/use-finance-data.ts`
- [x] T069 [P] [US2] Update analytics view models to use shared types in `/Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/analytics-filters.tsx`
- [x] T070 [P] [US2] Update list/trip/visit mapping to typed view models in `/Users/charlesponti/Developer/hominem/apps/rocco/app/routes/lists.$id.tsx`
- [x] T071 [P] [US2] Update route-level loaders to return typed data in `/Users/charlesponti/Developer/hominem/apps/rocco/app/routes/visits.tsx`
- [x] T072 [P] [US2] Update transformer output typing in `/Users/charlesponti/Developer/hominem/packages/hono-client/src/core/transformer.ts`

**Checkpoint**: Data flow uses shared, explicit types from contracts or schemas.

---

## Phase 5: User Story 3 - Test Suite Compatibility (Priority: P3)

**Goal**: Tests compile and run without explicit `any`.

**Independent Test**: `bun run test` passes with no `any` usage in test files.

### Implementation for User Story 3

- [x] T073 [P] [US3] Replace `any` route/component typing in `/Users/charlesponti/Developer/hominem/apps/rocco/app/test/account.test.tsx`
- [x] T074 [P] [US3] Replace `any` route/component typing in `/Users/charlesponti/Developer/hominem/apps/rocco/app/test/list.test.tsx`
- [x] T075 [P] [US3] Replace `any` loader typing in `/Users/charlesponti/Developer/hominem/apps/rocco/app/test/dashboard.test.tsx`
- [x] T076 [P] [US3] Replace mocked hook `any` typing in `/Users/charlesponti/Developer/hominem/apps/rocco/app/test/roccoMocker.ts`

- [x] T077 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/packages/db/src/test/utils.ts`
- [x] T078 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/packages/services/src/google-calendar.service.test.ts`
- [x] T079 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/packages/places/src/places.service.test.ts`
- [x] T080 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/packages/places/src/google-places.service.test.ts`
- [x] T081 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/services/api/src/routes/finance/plaid/finance.plaid.router.test.ts`
- [x] T082 [P] [US3] Replace test `any` usage in `/Users/charlesponti/Developer/hominem/services/api/test/utils.ts`

**Checkpoint**: Tests compile and run without explicit `any`.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation updates

- [x] T083 [P] Update guidance and definition of done in `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/quickstart.md`
- [x] T084 [P] Confirm research decisions reflect final approach in `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/research.md`
- [x] T085 Run repo-wide checks and update results in `/Users/charlesponti/Developer/hominem/specs/001-remove-any-types/research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Final Phase)**: Depends on completion of desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational - no dependencies on other stories
- **User Story 2 (P2)**: Starts after Foundational - depends on P1 only for shared types
- **User Story 3 (P3)**: Starts after Foundational - can proceed after P1

### Parallel Opportunities

- Tasks marked [P] can be run in parallel (different files, no dependencies)
- User stories can proceed in parallel after Foundational completion
- App-level changes across `apps/finance`, `apps/rocco`, `apps/notes` can be parallelized

---

## Parallel Example: User Story 1

```/dev/null/tasks.md#L1-8
Task: "Replace `any` usage in /Users/charlesponti/Developer/hominem/apps/finance/app/components/analytics/analytics-filters.tsx"
Task: "Replace `any` usage in /Users/charlesponti/Developer/hominem/apps/rocco/app/routes/visits.tsx"
Task: "Replace `any` usage in /Users/charlesponti/Developer/hominem/packages/hono-rpc/src/routes/places.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate with `rg "as\\s+any|\\bany\\b" ...` and `bun run typecheck`

### Incremental Delivery

1. Setup + Foundational
2. User Story 1 → validate
3. User Story 2 → validate
4. User Story 3 → validate
5. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [US?] label maps task to specific user story
- Each user story should be independently completable and testable
- Avoid vague tasks and cross-story dependencies that break independence