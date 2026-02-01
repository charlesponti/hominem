---
applyTo: 'packages/hono-rpc/**, services/api/**, apps/api/**, packages/**/src/routes/**'
---

# Hono RPC API Engineering Guidelines

This file is the **authoritative source** for all best practices, architecture decisions, and patterns for shipping production-grade, high-performance Hono RPC APIs in this monorepo.  
_Last updated: 2026-01_

## Table of Contents

- Purpose & Scope
- Core Architectural Rules
- Design and Implementation Patterns
- Error Handling & Results Envelopes
- Type System: Contracts & Definition Strategy
- Input Validation with Zod
- Service Layer Responsibilities
- Route/Endpoint Layer Responsibilities
- Serialization and Performance
- Testing Patterns
- Anti-Patterns ("What NOT to do")
- Migration Checklist
- TypeScript Config Requirements
- Summary Table

---

## Purpose & Scope

These guidelines ensure every API:

- Is strictly type-safe (types-first, never inferred from implementation)
- Provides clear, predictable error handling
- Is framework-agnostic at the service layer
- Supports high performance and easy debugging
- Can be confidently migrated and extended

Applies to:

- All Hono RPC and REST API endpoints (`packages/hono-rpc/**`, `services/api/**`, `apps/api/**`)
- All service, contract, and model definitions consumed by APIs

---

## 1. Core Architectural Rules

### Explicit Contracts (Types-First)

- Every API input and output **must** be a named TypeScript `type` or `interface`, exported from `packages/hono-rpc/src/types` or the relevant service package.
- NEVER infer route types from Hono app or implementation via `typeof app` – always import types directly.
- All domain models come from `@hominem/db/schema`, re-exported by service packages if needed.

### REST Boundaries

- Always use Hono for HTTP routing, and **standard HTTP status codes** for error states (400, 401, 403, 404, 409, 500).
- API endpoints must map service errors to HTTP status + clear `ApiResult` error envelopes.

### Layer Separation

- Service layer: pure business logic, never coupled to HTTP/framework, throws typed errors.
- Route/Endpoint layer: validates input, calls service, serializes output, catches errors, and shapes responses.

---

## 2. Design and Implementation Patterns

### Hono RPC Route Structure

**Pattern:**

```typescript
import { Hono } from 'hono';
import type { AppEnv } from '../server';
import { zValidator } from '@hono/zod-validator';
import { placeCreateInputSchema } from '../types/places.types';
import { placeService } from '@hominem/services';
import { success, error } from '@hominem/services';

export const placesRoutes = new Hono<AppEnv>().post(
  '/create',
  zValidator('json', placeCreateInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const place = await placeService.create(input);
      return c.json(success(place), 201);
    } catch (err) {
      // Error handling pattern: see below
    }
  },
);
```

### Endpoint Error Handling

**Enforce** this discriminated union response pattern for all endpoints:

- On success: `{ success: true, data }` (status 200 or 201)
- On error: `{ success: false, code, message, details? }` (with mapped status)

Catch errors in this order:

1. ValidationError → 400
2. NotFoundError → 404
3. UnauthorizedError → 401
4. ForbiddenError → 403
5. ConflictError → 409
6. Fallback/Error → 500

**Never expose internal stack traces or error details to the client.**

---

## 3. Error Handling & Result Envelopes

### Allowed Error Types (and HTTP Mapping)

- `ValidationError` (400) — Bad input, client problem.
- `NotFoundError` (404) — Resource doesn't exist.
- `UnauthorizedError` (401) — Authentication required.
- `ForbiddenError` (403) — Permission denied.
- `ConflictError` (409) — Duplicate/integrity constraints, etc.
- `UnavailableError` (503) — Upstream/downstream/infra errors.

**Pattern:**

```typescript
return ctx.json(error('VALIDATION_ERROR', err.message, err.details), 400);
return ctx.json(error('NOT_FOUND', err.message, err.details), 404);
// etc.
```

**Never**:

- Include HTTP status code in error objects.
- Throw plain `Error` for anything that the client should see.

---

## 4. Type System: Contracts & Single Source of Truth

- All domain entities/types: `@hominem/db/schema`
- All API request/response types: service packages or `packages/hono-rpc/src/types`
- **Never** duplicate type definitions across packages (always import from the domain source)
- All service input types inferred from Zod schemas

**Example:**

```typescript
// Good:
import type { Place, PlaceInsert } from '@hominem/db/schema';

// Good:
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

// Bad:
interface Place {
  id: string;
  name: string;
} // Don't do this
```

---

## 5. Input Validation with Zod

- All API and service inputs must be validated using Zod schemas
- All schemas must be exported from the same file as the function that uses them
- Reuse schemas in both service and endpoint layers

Example:

```typescript
export const createPlaceSchema = z.object({
  name: z.string().min(1),
  // ...
});
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
```

---

## 6. Service Layer Responsibilities

- **Pure async functions**: always accept a single object parameter (even for one argument)
- **Throw typed errors** for all validation/business logic failures
- **Return only domain models** – never union types, never an object with `error` keys
- Never reference Hono/context/HTTP/concrete framework logic

Service Example:

```typescript
export async function createPlace(params: CreatePlaceInput): Promise<Place> {
  // ...
  if (!params.name) throw new ValidationError('Name required');
  // ...
}
```

---

## 7. Route/Endpoint Layer Responsibilities

- Validate input (`zValidator('json', schema)`)
- Call service function w/ validated params
- Catch all service errors in correct order; map them to HTTP using ApiResult shape
- Serialize any Date objects as ISO strings before sending response
- Use the discriminated ApiResult union for every response

Route Example:

```typescript
router.post('/foo', zValidator('json', fooSchema), async (ctx) => {
  try {
    const result = await fooService.create(ctx.req.valid('json'));
    return ctx.json(success(serialize(result)), 201);
  } catch (err) {
    if (err instanceof ValidationError)
      return ctx.json(error('VALIDATION_ERROR', err.message, err.details), 400);
    if (err instanceof NotFoundError)
      return ctx.json(error('NOT_FOUND', err.message, err.details), 404);
    // etc...
    return ctx.json(error('INTERNAL_ERROR', 'An unexpected error occurred'), 500);
  }
});
```

---

## 8. Serialization and Performance

- **Always** serialize `Date` objects to ISO strings in the route layer before returning JSON.
- Use `success()` and `error()` helpers for envelope formatting (including correct type narrows).
- Route handlers should remain thin: input → service → output.

---

## 9. Testing Patterns

- **Service Tests**: Test that service functions throw the correct errors and return correct models.
- **Endpoint Tests**: Test that endpoints return the right `ApiResult` union (success/error) and status, and never leak stack traces.
- Use Vitest.

Service Test Example:

```typescript
it('throws NotFoundError when not found', async () => {
  await expect(getPlaceById({ id: '404' })).rejects.toThrow(NotFoundError);
});
```

Endpoint Test Example:

```typescript
it('returns 404 and error', async () => {
  const res = await app.request('/places/404');
  expect(res.status).toBe(404);
  const data = await res.json();
  expect(data.success).toBe(false);
  expect(data.code).toBe('NOT_FOUND');
});
```

---

## 10. Anti-Patterns

- Don't return `{ error: string }` or other ad-hoc unions from services.
- Don't mix error and success information in results—always throw or return, never both.
- Don't put status codes into service logic.
- Don't duplicate type definitions.
- Don't put HTTP/context-specific logic into services.
- Don't expose any details object to the UI—always provide friendly, non-sensitive error messages.

---

## 11. Migration Checklist

- [ ] Move all API and HTTP endpoints to Hono RPC under `packages/hono-rpc/src/routes/*`
- [ ] Ensure all inputs validated with exported Zod schemas
- [ ] All function signatures: object params, inferred from schema
- [ ] All services throw typed errors (never union types)
- [ ] Endpoints catch and map errors; return correct ApiResult union and HTTP status
- [ ] All types imported from their single source of truth
- [ ] All endpoints tested end-to-end (success/error)
- [ ] All Date objects serialized to ISO strings in outputs
- [ ] No remaining tRPC (`@trpc`, `@hominem/trpc`) imports
- [ ] Typecheck passes and strict mode is on in `tsconfig.json`

---

## 12. TypeScript Config Requirements

Make sure strict type checking is fully enabled.  
Include in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## 13. Summary Table

| Aspect                   | Pattern                                                         |
| ------------------------ | --------------------------------------------------------------- |
| **Contracts**            | Explicit, named TypeScript `type`/`interface`                   |
| **Type source**          | Single source per domain in `@hominem/db/schema`                |
| **Input validation**     | Zod schemas, exported from where they're used                   |
| **Service errors**       | Throw typed errors, never return error unions                   |
| **Route error handling** | Catch and map errors, return ApiResult with correct HTTP status |
| **API result**           | Use discriminated union: success/error (`ApiResult<T>`)         |
| **Serialization**        | Dates as ISO strings; always in route layer                     |
| **Testing**              | Both service and endpoint contract tests (Vitest)               |
| **Strict TS**            | All endpoints/packages strictly type-checked                    |

---

**By following these standards, you will create APIs that are robust, maintainable, and ready for high-throughput, production use, with agent- and user-parity throughout the stack.**
