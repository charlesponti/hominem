---
applyTo: 'packages/*/src/**/*.ts, services/api/**/*.ts, packages/hono-rpc/**/*.ts'
---

# API Contract Guidelines

This document defines how to design, implement, and maintain type-safe API contracts in Hominem.

## Overview

An **API contract** is a machine-readable agreement between service layers (what they provide) and consumers (what they expect). Hominem uses:

1. **Service Layer**: Throws typed errors, returns domain models
2. **HTTP Layer**: Catches errors, returns discriminated unions
3. **Client Layer**: Receives typed responses, uses type narrowing

## Core Patterns

### 1. Error Handling in Services

Services **throw typed errors**. This keeps business logic clean and lets errors propagate naturally.

```typescript
// ✅ Good: Service throws errors
import { NotFoundError, ConflictError, ValidationError } from '@hominem/services';

export async function sendListInvite(params: SendListInviteParams): Promise<ListInvite> {
  // Validate input
  if (!params.invitedUserEmail.includes('@')) {
    throw new ValidationError('Invalid email format', { field: 'email' });
  }

  // Check preconditions
  const list = await db.query.list.findFirst({
    where: eq(list.id, params.listId),
  });

  if (!list) {
    throw new NotFoundError('List', { listId: params.listId });
  }

  // Check conflicts
  const existing = await db.query.listInvite.findFirst({
    where: and(
      eq(listInvite.listId, params.listId),
      eq(listInvite.invitedUserEmail, params.invitedUserEmail),
    ),
  });

  if (existing && !existing.accepted) {
    throw new ConflictError('Invite already exists for this email');
  }

  // ... business logic
  return createdInvite;
}
```

**Error Types Available:**

- `ValidationError` - Input validation failed (HTTP 400)
- `NotFoundError` - Resource doesn't exist (HTTP 404)
- `UnauthorizedError` - User not authenticated (HTTP 401)
- `ForbiddenError` - User not authorized (HTTP 403)
- `ConflictError` - Resource conflict (HTTP 409)
- `UnavailableError` - External dependency unavailable (HTTP 503)

**Rules:**

- Throw immediately on validation errors (before business logic)
- Include `details` parameter for debugging: `new NotFoundError('User', { userId })`
- Don't include HTTP status codes in error messages
- Don't include sensitive data in error details

### 2. Input Validation with Zod

All service functions validate inputs using Zod schemas. Export schemas from your service package.

```typescript
// packages/lists/src/list-invites.service.ts
import { z } from 'zod';

export const sendListInviteSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  invitedUserEmail: z.string().email('Invalid email format'),
  invitingUserId: z.string().uuid('Invalid user ID'),
  baseUrl: z.string().url('Invalid base URL'),
});

export type SendListInviteParams = z.infer<typeof sendListInviteSchema>;

export async function sendListInvite(params: SendListInviteParams): Promise<ListInvite> {
  // params is guaranteed to be valid
  // ...
}

// packages/lists/src/index.ts
export {
  sendListInvite,
  sendListInviteSchema,
  type SendListInviteParams,
} from './list-invites.service';
```

**Rules:**

- Define schema near the function that uses it
- Export schema from service package
- Infer TypeScript type from schema
- Use schema in HTTP endpoint validation (zValidator)

### 3. Service Function Signature Pattern

Use consistent signatures for all service functions:

```typescript
// Input parameter type (inferred from schema)
export type GetPlaceByIdParams = z.infer<typeof getPlaceByIdSchema>;

// Function signature
export async function getPlaceById(params: GetPlaceByIdParams): Promise<Place> {
  // ...
}

// Single query function (no params)
export async function getAllPlaces(): Promise<Place[]> {
  // ...
}

// Mutation with multiple params (always use object)
export async function updatePlace(params: UpdatePlaceParams): Promise<Place> {
  // params contains { id, name, ... }
  // ...
}
```

**Rules:**

- Always use object parameters (even for single value) to allow future expansion
- Return domain model (e.g., `Place`, `ListInvite`, not `Place[]` unions)
- Make functions `async` even if not doing I/O (future-proofs)
- Use plural names for array returns: `getAllPlaces()`, not `getPlace()`

### 4. HTTP Endpoint Pattern

HTTP endpoints catch service errors and return `ApiResult` discriminated unions.

```typescript
// packages/hono-rpc/src/routes/lists.ts
import { zValidator } from '@hono/zod-validator';
import { sendListInvite, sendListInviteSchema } from '@hominem/lists-services';
import { ValidationError, NotFoundError, ConflictError } from '@hominem/services';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';

const router = new Hono();

router.post(
  '/lists/:listId/invites/send',
  zValidator('json', sendListInviteSchema),
  async (ctx) => {
    try {
      const result = await sendListInvite({
        ...ctx.req.valid('json'),
        listId: ctx.req.param('listId'),
      });
      return ctx.json(success(result), 201);
    } catch (err) {
      if (err instanceof ValidationError) {
        return ctx.json(error('VALIDATION_ERROR', err.message, err.details), 400);
      }
      if (err instanceof NotFoundError) {
        return ctx.json(error('NOT_FOUND', err.message, err.details), 404);
      }
      if (err instanceof ConflictError) {
        return ctx.json(error('CONFLICT', err.message, err.details), 409);
      }
      // Catch-all for unexpected errors
      console.error('Unexpected error:', err);
      return ctx.json(error('INTERNAL_ERROR', 'An unexpected error occurred'), 500);
    }
  },
);

export default router;
```

**Pattern:**

1. Validate input with `zValidator('json', schema)`
2. Call service function (which may throw)
3. Return `success(data)` on success (use appropriate HTTP status: 200, 201, etc.)
4. Catch specific error types in order (most specific first)
5. Return `error(code, message, details)` with appropriate HTTP status
6. Have catch-all for unexpected errors

**Rules:**

- Always validate inputs before calling service
- Catch errors in this order: ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, then catch-all
- Use appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500, 503)
- Never expose internal error messages to clients (use generic "An unexpected error occurred")
- Log unexpected errors with context for debugging

### 5. API Result Type

The `ApiResult<T>` type is a discriminated union clients use with type narrowing:

```typescript
// Response shape
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;
```

**Client usage with type narrowing:**

```typescript
const result = await fetch('/lists/123/invites/send', {
  method: 'POST',
  body: JSON.stringify({ ... }),
})

const data: ApiResult<ListInvite> = await result.json()

if (data.success) {
  // ✅ TypeScript knows data.data is ListInvite
  console.log(data.data.id)
} else {
  // ✅ TypeScript knows data.code and data.message are available
  console.error(`${data.code}: ${data.message}`)
}
```

**Rules:**

- Always use the `success` discriminator to narrow types
- Never check for properties to determine success (brittle)
- Log errors with their details for debugging
- Show user-friendly messages in UI (never expose `details` to users)

## Type Definition Location Strategy

**Single source of truth per domain:**

```
packages/db/src/schema/
  ├── place.ts          → Place, PlaceInsert types
  ├── list.ts           → List, ListInsert, ListInvite types
  └── user.ts           → User, UserInsert types

packages/places/src/
  ├── places.service.ts → Functions (Place, PlaceInsert from @hominem/db/schema)
  └── index.ts          → Re-exports from db/schema + service functions

packages/lists/src/
  ├── list-invites.service.ts → Functions (List, ListInvite from @hominem/db/schema)
  └── index.ts                → Re-exports from db/schema + service functions
```

**Rules:**

- **All domain types** come from `@hominem/db/schema` (single source)
- Service packages **re-export** types from db for convenience
- Service packages **only add** request parameter types (Zod inferred)
- Never duplicate type definitions across packages

**Import pattern for consumers:**

```typescript
// ✅ Good: Import types from db/schema (source of truth)
import type { Place, ListInvite } from '@hominem/db/schema';

// ✅ Good: Import functions from service packages
import { getPlaceById } from '@hominem/places-services';
import { sendListInvite } from '@hominem/lists-services';

// ✅ Acceptable: Import from service if they re-export db types
import type { Place } from '@hominem/places-services';

// ❌ Never: Create your own type definitions or interfaces
interface Place {
  /* ... */
} // Don't do this
```

## Service Package Organization

Each service package follows this structure:

```typescript
// src/types.ts (optional - only if adding request types beyond Zod)
export type GetPlaceParams = z.infer<typeof getPlaceSchema>;
export type CreatePlaceParams = z.infer<typeof createPlaceSchema>;

// src/place.service.ts
import { z } from 'zod';
import type { Place } from '@hominem/db/schema';
import { NotFoundError, ValidationError } from '@hominem/services';

export const getPlaceSchema = z.object({
  id: z.uuid(),
});

export type GetPlaceParams = z.infer<typeof getPlaceSchema>;

export async function getPlaceById(params: GetPlaceParams): Promise<Place> {
  // ...
}

// src/index.ts
export type {
  Place,
  PlaceInsert,
  // ... other types from @hominem/db/schema
} from '@hominem/db/schema';

export { getPlaceById, createPlace, updatePlace, deletePlace } from './place.service';

export {
  getPlaceSchema,
  createPlaceSchema,
  updatePlaceSchema,
  deletePlaceSchema,
} from './place.service';

export type {
  GetPlaceParams,
  CreatePlaceParams,
  UpdatePlaceParams,
  DeletePlaceParams,
} from './place.service';
```

## Testing API Contracts

### Service Function Tests

Test that services throw the correct errors:

```typescript
// packages/places/src/places.service.test.ts
import { describe, it, expect } from 'vitest';
import { getPlaceById } from './places.service';
import { NotFoundError } from '@hominem/services';

describe('getPlaceById', () => {
  it('returns Place on success', async () => {
    const place = await getPlaceById({ id: validPlaceId });
    expect(place).toHaveProperty('id');
    expect(place).toHaveProperty('name');
  });

  it('throws NotFoundError when place does not exist', async () => {
    await expect(getPlaceById({ id: 'nonexistent-id' })).rejects.toThrow(NotFoundError);
  });
});
```

### HTTP Endpoint Tests

Test that endpoints return correct response shapes:

```typescript
// packages/hono-rpc/src/routes/places.test.ts
import { describe, it, expect } from 'vitest';
import type { ApiResult } from '@hominem/services';
import type { Place } from '@hominem/db/schema';
import app from '../index'; // Your Hono app

describe('GET /places/:id', () => {
  it('returns 200 with success response', async () => {
    const res = await app.request(`/places/${validPlaceId}`);

    expect(res.status).toBe(200);
    const data: ApiResult<Place> = await res.json();

    expect(data.success).toBe(true);
    if (data.success) {
      expect(data.data).toHaveProperty('id');
    }
  });

  it('returns 404 with error response when place not found', async () => {
    const res = await app.request('/places/nonexistent-id');

    expect(res.status).toBe(404);
    const data: ApiResult<Place> = await res.json();

    expect(data.success).toBe(false);
    if (!data.success) {
      expect(data.code).toBe('NOT_FOUND');
      expect(data.message).toContain('not found');
    }
  });
});
```

## Anti-Patterns (What NOT to Do)

```typescript
// ❌ Don't return unions with error in response
export async function sendInvite(params: SendInviteParams): Promise<Invite | { error: string }>;

// ✅ Do throw errors instead
export async function sendInvite(params: SendInviteParams): Promise<Invite>;

// ❌ Don't include HTTP status in error object
throw new Error('Not found', 404);

// ✅ Do use typed error class
throw new NotFoundError('Invite');

// ❌ Don't use "success" field in service return types
export async function getUser(
  id: string,
): Promise<{ success: true; data: User } | { success: false; error: string }>;

// ✅ Do only throw or return the model
export async function getUser(id: string): Promise<User>;

// ❌ Don't define duplicate types in service packages
export interface Place {
  id: string;
  name: string;
}

// ✅ Do re-export from db/schema
export type { Place } from '@hominem/db/schema';

// ❌ Don't use any or unknown in public APIs
export function processData(data: any): void;

// ✅ Do use specific types
export function processData(data: Place): void;

// ❌ Don't mix error handling patterns
if (!user) return { error: 'Not found' };
throw new ValidationError('Invalid input');

// ✅ Do use consistent error pattern
if (!user) throw new NotFoundError('User');
if (!isValid) throw new ValidationError('Input invalid');
```

## Migration Checklist

When migrating an existing service to this contract pattern:

- [ ] Create Zod schemas for all function parameters
- [ ] Update function signatures to use schema-inferred types
- [ ] Replace `Promise<T | { error: ... }>` returns with throwing errors
- [ ] Update HTTP endpoints to use error catching + ApiResult
- [ ] Update type exports in `index.ts`
- [ ] Update imports in consuming code
- [ ] Add contract tests for service functions
- [ ] Add contract tests for HTTP endpoints
- [ ] Update any middleware that handles errors
- [ ] Test error scenarios end-to-end

## TypeScript Configuration

Ensure strict mode is enabled in `tsconfig.json`:

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

## Summary

| Aspect                       | Pattern                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| **Service function errors**  | Throw typed errors (ValidationError, NotFoundError, etc.)    |
| **Service function returns** | Return domain model directly, or throw on failure            |
| **Input validation**         | Zod schemas, exported from service package                   |
| **HTTP endpoints**           | Catch errors, return ApiResult with type narrowing           |
| **Type definitions**         | Single source of truth in @hominem/db/schema                 |
| **Type exports**             | Service packages re-export from db/schema                    |
| **Error information**        | Include code, message, and optional debugging details        |
| **HTTP status codes**        | In endpoint layer only, derived from error type              |
| **Testing**                  | Contract tests for both service functions and HTTP endpoints |

This ensures **type safety at compile time** and **clear contracts at runtime**.
