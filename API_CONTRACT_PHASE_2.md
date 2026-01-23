# API Contract Design - Phase 2: Service Migrations

**Project:** Hominem Monorepo  
**Initiative:** Superior API Contract Design with Type-Safe Error Handling  
**Phase:** 2 of 4  
**Status:** 🚧 Ready to Start  
**Estimated Duration:** 15-20 hours  
**Last Updated:** 2024

---

## Executive Summary

Phase 2 focuses on migrating all business logic services to the new API contract pattern established in Phase 1. This involves updating service functions to throw typed errors, defining Zod schemas for input validation, and updating corresponding HTTP endpoints to handle errors with the `ApiResult` type.

By the end of Phase 2, all services will follow the pattern: **Services throw errors → Endpoints catch and convert → Clients narrow types**, enabling type-safe error handling across the entire application.

---

## Objectives

- **Migrate Services:** Update all service functions to use typed errors and Zod schemas.
- **Update Endpoints:** Modify HTTP routes to catch service errors and return `ApiResult` responses.
- **Maintain Compatibility:** Ensure existing clients continue to work during migration.
- **Type Safety:** Achieve zero `any`/`unknown` in service APIs and full TypeScript enforcement.
- **Documentation:** Update internal docs to reflect new patterns.

---

## Scope and Priorities

Phase 2 covers migration of all domain services in the monorepo, prioritized by complexity and dependencies.

### Priority 1: List Services (4 hours)

The `lists` package contains core functionality with multiple interdependent services.

- [ ] `packages/lists/src/list-crud.service.ts` - Basic list operations (create, read, update, delete)
- [ ] `packages/lists/src/list-items.service.ts` - Item management within lists
- [ ] `packages/lists/src/list-queries.service.ts` - Complex list queries and filtering
- [ ] `packages/lists/src/list-collaborators.service.ts` - User collaboration features

### Priority 2: Places & Trips Services (6 hours)

The `places` package handles location and travel data with moderate complexity.

- [ ] `packages/places/src/places.service.ts` - Location management and geocoding
- [ ] `packages/places/src/trips.service.ts` - Trip planning and itinerary features
- [ ] Update `packages/hono-rpc/src/routes/places.ts` - HTTP endpoints for places
- [ ] Update `packages/hono-rpc/src/routes/trips.ts` - HTTP endpoints for trips

### Priority 3: Domain Services (4-6 hours)

Remaining domain-specific packages with varying complexity.

- [ ] `@hominem/events-services` - Event scheduling and management (3 hours)
- [ ] `@hominem/finance-services` - Financial transactions and budgeting (4 hours)
- [ ] `@hominem/jobs-services` - Background job processing and queues (2 hours)

---

## Detailed Migration Plan

### Migration Pattern

For each service, follow this 5-step process:

1. **Define Zod Schema:** Create input validation schemas in the service file.
2. **Update Function Signatures:** Change service functions to accept validated parameters and throw typed errors.
3. **Migrate Business Logic:** Replace union returns with typed error throws.
4. **Update HTTP Endpoints:** Wrap service calls in try/catch, return `ApiResult`.
5. **Test & Validate:** Ensure type-check passes and contracts are maintained.

### Example Migration

```typescript
// Before: Ambiguous union return
export async function createList(params: any): Promise<List | { error: string; status: number }>;

// After: Typed error throwing
export const createListSchema = z.object({ name: z.string().min(1), ownerId: z.string() });
export async function createList(params: z.infer<typeof createListSchema>): Promise<List> {
  if (exists) throw new ConflictError('List already exists');
  return newList;
}

// Endpoint: Catch and convert
router.post('/lists', zValidator('json', createListSchema), async (ctx) => {
  try {
    const list = await createList(ctx.req.valid('json'));
    return ctx.json(success(list), 201);
  } catch (err) {
    if (err instanceof ConflictError) {
      return ctx.json(error('CONFLICT', err.message), 409);
    }
    // ... handle other errors
  }
});
```

### Error Type Usage

Use the appropriate error class for each scenario:

| Error Class         | When to Use              | HTTP Status |
| ------------------- | ------------------------ | ----------- |
| `ValidationError`   | Input validation fails   | 400         |
| `UnauthorizedError` | User not authenticated   | 401         |
| `ForbiddenError`    | User lacks permission    | 403         |
| `NotFoundError`     | Resource doesn't exist   | 404         |
| `ConflictError`     | Resource already exists  | 409         |
| `UnavailableError`  | Service temporarily down | 503         |
| `InternalError`     | Unexpected server error  | 500         |

---

## Migration Checklist

For each service file, complete these steps:

### Service Migration Checklist

- [ ] **Import Error Types:** Add imports from `@hominem/services`
- [ ] **Define Zod Schema:** Create schema for function parameters
- [ ] **Update Function Signature:** Accept `z.infer<typeof schema>` instead of `any`
- [ ] **Replace Union Returns:** Throw errors instead of returning `{ error: ... }`
- [ ] **Update Business Logic:** Use typed errors for all failure cases
- [ ] **Export Schema:** Add schema to package index for endpoint use
- [ ] **Type Check:** Run `bun run typecheck` to verify no errors

### Endpoint Migration Checklist

- [ ] **Import ApiResult Helpers:** Add `success` and `error` from `@hominem/services`
- [ ] **Add zValidator:** Use `zValidator('json', schema)` for request validation
- [ ] **Wrap Service Call:** Put service call in try/catch block
- [ ] **Handle Success:** Return `ctx.json(success(data), status)` (201 for create, 200 for others)
- [ ] **Handle Errors:** Map each error type to appropriate `ApiResult` and status code
- [ ] **Test Endpoint:** Verify responses match expected `ApiResult` shape

### Testing Checklist

- [ ] **Unit Tests:** Update service tests to expect thrown errors
- [ ] **Integration Tests:** Verify endpoint returns correct `ApiResult` for success/error cases
- [ ] **Type Safety:** Ensure client code can narrow types without runtime checks

---

## Estimated Timeline

| Priority  | Services         | Hours     | Cumulative |
| --------- | ---------------- | --------- | ---------- |
| 1         | List Services    | 4         | 4          |
| 2         | Places & Trips   | 6         | 10         |
| 3         | Domain Services  | 5         | 15         |
| **Total** | **All Services** | **15-20** | **15-20**  |

_Note: Times include both service and endpoint updates. Buffer for unexpected complexity._

---

## Success Criteria

- [ ] **All Services Migrated:** Every service function throws typed errors and uses Zod schemas
- [ ] **All Endpoints Updated:** HTTP routes return `ApiResult` with proper error handling
- [ ] **Type Check Passes:** `bun run typecheck` succeeds with no errors
- [ ] **Lint Passes:** `bun run lint` succeeds
- [ ] **Zero Ambiguous Types:** No `any` or `unknown` in service public APIs
- [ ] **Backward Compatibility:** Existing clients continue to work (no breaking changes)
- [ ] **Documentation Updated:** Internal docs reflect new patterns

---

## Dependencies

- **Phase 1 Complete:** Error hierarchy and `ApiResult` types must be available
- **Reference Implementation:** Use `list-invites.service.ts` as migration template
- **Guidelines:** Follow `.github/instructions/api-contracts.instructions.md`
- **Tools:** Bun, TypeScript, Zod, Hono

---

## Risks and Mitigations

| Risk                   | Mitigation                                                     |
| ---------------------- | -------------------------------------------------------------- |
| **Breaking Changes**   | Migrate incrementally; test each service before moving to next |
| **Type Errors**        | Run `bun run typecheck` after each migration step              |
| **Performance Impact** | Minimal - error throwing is standard practice                  |
| **Team Confusion**     | Reference quickstart guide and examples                        |

---

## Next Steps

1. **Start Migration:** Begin with Priority 1 (List Services) - easiest to test
2. **Follow Checklist:** Use the migration checklist for each service
3. **Test Frequently:** Run typecheck and tests after each service
4. **Update Docs:** Mark completed services in this document
5. **Phase 3 Prep:** Once all services migrated, prepare for client updates

---

## Resources

- **Quick Reference:** [API_CONTRACT_QUICKSTART.md](./API_CONTRACT_QUICKSTART.md)
- **Detailed Guidelines:** [.github/instructions/api-contracts.instructions.md](./.github/instructions/api-contracts.instructions.md)
- **Example Migration:** [packages/lists/src/list-invites.service.ts](./packages/lists/src/list-invites.service.ts)
- **Error Types:** [packages/services/src/errors.ts](./packages/services/src/errors.ts)

---

## Status Tracking

Update this table as you complete each service:

| Service                         | Status     | Notes |
| ------------------------------- | ---------- | ----- |
| `list-crud.service.ts`          | ⏳ Pending |       |
| `list-items.service.ts`         | ⏳ Pending |       |
| `list-queries.service.ts`       | ⏳ Pending |       |
| `list-collaborators.service.ts` | ⏳ Pending |       |
| `places.service.ts`             | ⏳ Pending |       |
| `trips.service.ts`              | ⏳ Pending |       |
| `events-services`               | ⏳ Pending |       |
| `finance-services`              | ⏳ Pending |       |
| `jobs-services`                 | ⏳ Pending |       |

---

**Phase 2 Lead:** [Your Name]  
**Estimated Completion:** [Date + 15-20 hours]  
**Next Phase:** Phase 3 (Consumer Updates)

Good luck! 🚀
