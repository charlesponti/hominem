## Integration-First Testing Foundation (Task 2.3 / 2.4)

### Policy (Required)

1. Default to DB-backed integration tests for service capabilities.
2. Unit tests are allowed only for isolated pure logic (mappers/state machines/validators).
3. No placeholder tests:
   - no `expect.skip(...)`
   - no commented-out assertions as placeholders
   - no `test.todo(...)` for capability coverage
4. Every test must have concrete arrange/act/assert behavior.
5. RED-GREEN is mandatory:
   - RED: add failing assertion first
   - GREEN: implement minimal behavior to satisfy it
   - REFACTOR: clean up while keeping tests green
6. Integration coverage must include both flow and invariants where applicable:
   - ownership/auth boundaries
   - idempotency
   - deterministic ordering/pagination
   - validation failures and not-found behavior

### Shared Scaffolding Source of Truth

Use shared scaffolding from:

- `@hominem/db/test/utils`
- underlying shared modules: `packages/db/src/test/services/_shared/*`

Available helpers:

- DB availability: `isIntegrationDatabaseAvailable`
- deterministic IDs: `createDeterministicIdFactory`
- deterministic users: `ensureIntegrationUsers`
- lifecycle/reset helpers: `withIsolatedTransaction`, `truncateTables`
- assertions: `expectNotFound`, `expectOwnershipDenied`, `expectIdempotentValue`
- time control: `freezeTestClock`, `withFrozenTestClock`
- seeded randomness: `createSeededRandom`
- domain seeds: `seedUser`, `seedFinanceDomain`, `seedTaskList`

### Standard Test Pattern

1. `describe.skipIf(!dbAvailable)` with `isIntegrationDatabaseAvailable()`
2. deterministic IDs (`createDeterministicIdFactory`)
3. deterministic user setup (`ensureIntegrationUsers`)
4. explicit cleanup for touched rows/tables
5. assert both business output and invariants

### Example Skeleton (Real, Non-Placeholder)

```ts
const dbAvailable = await isIntegrationDatabaseAvailable()
const nextId = createDeterministicIdFactory('module.integration')

describe.skipIf(!dbAvailable)('module integration', () => {
  let ownerId: string

  beforeEach(async () => {
    ownerId = nextId()
    await ensureIntegrationUsers([{ id: ownerId, name: 'Owner' }])
  })

  it('creates and reads owner data', async () => {
    const created = await createEntity({ userId: ownerId, name: 'A' })
    const loaded = await getEntity(created.id, ownerId)
    expect(loaded?.id).toBe(created.id)
  })
})
```

### Current Conversions Completed

- `packages/notes/src/notes.integration.test.ts`
- `packages/events/src/events.integration.test.ts`
- `packages/lists/src/list-crud.integration.test.ts`
- `packages/lists/src/list-sharing.integration.test.ts`
- `packages/finance/src/modern-finance.*.integration.test.ts` (all active suites)
- `packages/db/src/services/calendar.service.integration.test.ts`
- `packages/db/src/services/tasks.service.integration.test.ts`
- finance API integration route suites share setup/teardown through:
  - `services/api/test/finance-test-harness.ts`
