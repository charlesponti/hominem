# API Contract Design - Project Roadmap & Index

**Project:** Hominem Monorepo
**Initiative:** Superior API Contract Design with Type-Safe Error Handling
**Status:** ✅ Phase 2 Complete | 🚧 Phase 3 In Progress
**Last Updated:** 2024

---

## Quick Navigation

### 🚀 Start Here

- **New to this?** Read [API_CONTRACT_QUICKSTART.md](./API_CONTRACT_QUICKSTART.md) (5 min)
- **Want details?** Read [API_CONTRACT_IMPLEMENTATION_SUMMARY.md](./API_CONTRACT_IMPLEMENTATION_SUMMARY.md) (20 min)
- **Need guidelines?** Read [.github/instructions/api-contracts.instructions.md](./.github/instructions/api-contracts.instructions.md) (30 min)

### 📚 Documentation Files

| File                                                                                                       | Purpose                             | Time   | Audience                  |
| :--------------------------------------------------------------------------------------------------------- | :---------------------------------- | :----- | :------------------------ |
| [API_CONTRACT_QUICKSTART.md](./API_CONTRACT_QUICKSTART.md)                                                 | 30-second pattern + cheat sheets    | 5 min  | Developers (all levels)   |
| [API_CONTRACT_PHASE_2.md](./API_CONTRACT_PHASE_2.md)                                                       | Complete Phase 2 migration guide    | 20 min | Developers, leads         |
| [API_CONTRACT_PHASE_3.md](./API_CONTRACT_PHASE_3.md)                                                       | Complete Phase 3 consumer updates   | 15 min | Frontend developers       |
| [API_CONTRACT_PHASE_4.md](./API_CONTRACT_PHASE_4.md)                                                       | Testing and Documentation phase     | 10 min | All developers            |
| [.github/instructions/api-contracts.instructions.md](./.github/instructions/api-contracts.instructions.md) | Comprehensive guidelines & patterns | 30 min | Reference, implementation |

---

## The Pattern (30 Seconds)

```typescript
// 1. Service: Define schema + function that throws
export const createSchema = z.object({ email: z.string().email() })
export async function create(params: z.infer<typeof createSchema>): Promise<User> {
  if (exists) throw new ConflictError('Already exists')
  return newUser
}

// 2. Endpoint: Catch + convert to ApiResult
router.post('/users', zValidator('json', createSchema), async (ctx) => {
  try {
    const user = await create(ctx.req.valid('json'))
    return ctx.json(success(user), 201)
  } catch (err) {
    if (err instanceof ConflictError) {
      return ctx.json(error('CONFLICT', err.message), 409)
    }
    if (isServiceError(err)) {
      return ctx.json(error(err.code, err.message), err.statusCode)
    }
    return ctx.json(error('INTERNAL_ERROR', 'Error'), 500)
  }
})

// 3. Client: Type narrowing with discriminator
const result = await fetch('/users', {...}).then(r => r.json())
if (result.success) {
  console.log(result.data.id) // ✅ User
} else {
  console.error(result.message) // ✅ Error message
}
```

---

## Project Roadmap

### ✅ Phase 1: Foundations (Complete)

Established the core error hierarchy, response types, and guidelines.

- [x] **Core Types**: `Error` hierarchy and `ApiResult` type created.
- [x] **Documentation**: Comprehensive guidelines and quickstart guides written.
- [x] **Reference Implementation**: `list-invites` service and routes fully migrated.
- [x] **Infrastructure**: Build tools and linting configured.

### ✅ Phase 2: Service Migrations (Complete)

Migrating business logic to throw typed errors and defining Zod schemas for all inputs.

- [x] **List Services**: CRUD, Items, Queries, Collaborators migrated.
- [x] **Places & Trips**: Geocoding, travel planning, and routes updated.
- [x] **Domain Services**: Events, Finance, and Jobs converted to typed errors.

### 🚧 Phase 3: Consumer Updates (In Progress)

Updating frontend applications to leverage type-safe error handling.

- [x] **Rocco App**: Update React Query mutations and error boundaries.
- [ ] **Finance App**: Update transaction handling to use `ApiResult`.
- [ ] **Notes App**: Update sync logic to handle discriminated unions.

### 📅 Phase 4: Testing & Documentation (Est. 4-6 hours)

Solidifying the contract with tests and team hand-off. See [API_CONTRACT_PHASE_4.md](./API_CONTRACT_PHASE_4.md).

- [ ] **Contract Tests**: Add specific tests verifying error codes for all services.
- [ ] **Type-Level Tests**: Ensure discriminated union safety with `tsd`.
- [ ] **Documentation**: Finalize quickstart and troubleshooting guides.

---

## Error Types Reference

Import from `@hominem/services`:

```typescript
import {
  ValidationError, // 400 - Input invalid
  UnauthorizedError, // 401 - Not authenticated
  ForbiddenError, // 403 - Not authorized
  NotFoundError, // 404 - Resource missing
  ConflictError, // 409 - Already exists
  UnavailableError, // 503 - Service down
  InternalError, // 500 - Unexpected error
} from '@hominem/services';
```

---

## Key Concepts

### Services Pattern

- **Input:** Zod-validated parameters
- **Output:** Clean domain model (no unions)
- **Errors:** Thrown typed exceptions
- **Concerns:** Business logic only

### Endpoints Pattern

- **Input:** Validated by zValidator
- **Processing:** Call service in try/catch
- **Success:** Return `success(data)` with 201/200
- **Error:** Return `error(code, message)` with appropriate status

### Client Pattern

- **Request:** Await fetch
- **Response:** Discriminated union with `success` field
- **Type narrowing:** Safe checks with `if (result.success)`
- **Error handling:** Access `code` and `message`

---

## Documentation Hierarchy

```
API_CONTRACT_INDEX.md (this file)
├── Quick Navigation
├── The Pattern (30s)
├── Roadmap (Phases 1-4)
└── Error Types Reference

API_CONTRACT_QUICKSTART.md
├── The Pattern (30s)
├── Error Types Cheat Sheet
├── Writing a Service
├── Writing an Endpoint
├── Client Usage
└── Checklist

API_CONTRACT_PHASE_3.md
├── Executive Summary
├── Objectives
├── Scope and Priorities
├── Detailed Migration Plan
├── Migration Checklist
├── Estimated Timeline
├── Success Criteria
├── Dependencies
├── Risks and Mitigations
├── Next Steps
├── Resources
├── Status Tracking
└── Conclusion

.github/instructions/api-contracts.instructions.md
├── Overview
├── Core Patterns
├── Error Types (Detailed)
├── Input Validation
├── Anti-Patterns
└── Migration Checklist
```

---

## Status Summary

| Component               | Status               |
| :---------------------- | :------------------- |
| **Foundations**         | ✅ Complete          |
| **Documentation**       | ✅ Complete          |
| **Ref. Implementation** | ✅ Complete          |
| **Service Migrations**  | ✅ Complete          |
| **Client Updates**      | 🚧 In-Progress (Ph3) |
| **Contract Tests**      | 📅 Planned (Phase 4) |

---

**Last Updated:** 2024
**Current Phase:** Phase 3 (Consumer Updates)
