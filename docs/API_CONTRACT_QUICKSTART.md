# API Contract Quick-Start Guide

**TL;DR:** Services throw errors, endpoints catch and return ApiResult, clients use type narrowing.

## The Pattern (30 seconds)

```typescript
// 1. SERVICE: Define schema + function that throws
export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
});

export async function createUser(params: z.infer<typeof createUserSchema>): Promise<User> {
  const existing = await findByEmail(params.email);
  if (existing) {
    throw new ConflictError('User already exists');
  }
  return newUser;
}

// 2. ENDPOINT: Catch errors, return ApiResult
router.post('/users', zValidator('json', createUserSchema), async (ctx) => {
  try {
    const user = await createUser(ctx.req.valid('json'));
    return ctx.json(success(user), 201);
  } catch (error) {
    if (error instanceof ConflictError) {
      return ctx.json(error('CONFLICT', error.message), 409);
    }
    if (isServiceError(error)) {
      return ctx.json(error(error.code, error.message), error.statusCode);
    }
    return ctx.json(error('INTERNAL_ERROR', 'Server error'), 500);
  }
});

// 3. CLIENT: Use type narrowing
const result: ApiResult<User> = await fetch('/users', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', name: 'John' }),
}).then((r) => r.json());

if (result.success) {
  console.log(result.data.id); // ✅ TypeScript knows it's User
} else {
  console.error(result.message); // ✅ TypeScript knows it's error response
}
```

## Error Types (Cheat Sheet)

```typescript
import {
  ValidationError, // 400 - Input invalid
  UnauthorizedError, // 401 - Not authenticated
  ForbiddenError, // 403 - Not authorized
  NotFoundError, // 404 - Resource missing
  ConflictError, // 409 - Already exists/conflict
  UnavailableError, // 503 - Service down
  InternalError, // 500 - Unexpected error
} from '@hominem/services';

// Use like this:
if (!email.includes('@')) {
  throw new ValidationError('Invalid email', { field: 'email' });
}

if (!user) {
  throw new NotFoundError('User', { userId });
}

if (existing) {
  throw new ConflictError('Email already in use', { email });
}
```

## Writing a Service

### Step 1: Define Schema

```typescript
import { z } from 'zod';

export const updateUserSchema = z.object({
  id: z.uuid(),
  email: z.email().optional(),
  name: z.string().min(1).optional(),
});

export type UpdateUserParams = z.infer<typeof updateUserSchema>;
```

### Step 2: Write Function

```typescript
import { NotFoundError, ValidationError } from '@hominem/services';

export async function updateUser(params: UpdateUserParams): Promise<User> {
  // Validate
  if (!params.id) {
    throw new ValidationError('User ID is required');
  }

  // Check precondition
  const user = await findUser(params.id);
  if (!user) {
    throw new NotFoundError('User', { userId: params.id });
  }

  // Update
  return await db.update(users).set(params).returning();
}
```

### Step 3: Export Schema

```typescript
export { updateUserSchema, type UpdateUserParams };
```

## Writing an Endpoint

### Step 1: Import

```typescript
import { zValidator } from '@hono/zod-validator';
import { updateUser, updateUserSchema } from '@hominem/services/users';
import { success, error, isServiceError } from '@hominem/services';
```

### Step 2: Route Handler

```typescript
router.post('/users/:id', zValidator('json', updateUserSchema), async (ctx) => {
  try {
    const result = await updateUser(ctx.req.valid('json'));
    return ctx.json(success(result), 200);
  } catch (err) {
    // Specific errors first
    if (err instanceof NotFoundError) {
      return ctx.json(error('NOT_FOUND', err.message), 404);
    }
    if (err instanceof ValidationError) {
      return ctx.json(error('VALIDATION_ERROR', err.message), 400);
    }
    // Generic service error
    if (isServiceError(err)) {
      return ctx.json(error(err.code, err.message), err.statusCode);
    }
    // Unexpected
    console.error('Unexpected error:', err);
    return ctx.json(error('INTERNAL_ERROR', 'Server error'), 500);
  }
});
```

## Client Usage

### React Example

```typescript
import { useMutation } from '@tanstack/react-query'
import type { ApiResult, User } from '@hominem/services'

function UserForm() {
  const mutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json<ApiResult<User>>()
    },
    onSuccess: (result) => {
      if (result.success) {
        console.log('Created user:', result.data.id)
      } else {
        console.error(`Error: ${result.code} - ${result.message}`)
      }
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      mutation.mutate({ email: 'test@example.com', name: 'Test' })
    }}>
      {mutation.isPending && <p>Creating...</p>}
      {mutation.isError && <p>Error: {mutation.error?.message}</p>}
      <button type="submit">Create User</button>
    </form>
  )
}
```

## Common Mistakes

### ❌ Don't: Return errors from services

```typescript
export async function getUser(id: string): Promise<User | { error: string }> {
  if (!id) return { error: 'ID required' };
  // ...
}
```

### ✅ Do: Throw errors

```typescript
export async function getUser(id: string): Promise<User> {
  if (!id) throw new ValidationError('ID required');
  // ...
}
```

### ❌ Don't: Use positional parameters

```typescript
export function doThing(id: string, email: string, name: string, date: Date): Promise<Thing>;
```

### ✅ Do: Use object parameters

```typescript
export function doThing(params: DoThingParams): Promise<Thing>;
```

### ❌ Don't: Check for error fields

```typescript
const result = await callService();
if ('error' in result) {
  /* ... */
}
```

### ✅ Do: Use try/catch

```typescript
try {
  const result = await callService();
} catch (error) {
  if (error instanceof NotFoundError) {
    /* ... */
  }
}
```

### ❌ Don't: Use any/unknown

```typescript
export function process(data: any): void {
  /* ... */
}
```

### ✅ Do: Use specific types

```typescript
export function process(data: User): void {
  /* ... */
}
```

## When to Use Each Error Type

| Error                 | When                    | Example                                    |
| --------------------- | ----------------------- | ------------------------------------------ |
| **ValidationError**   | Input invalid           | Email format wrong, required field missing |
| **UnauthorizedError** | Not logged in           | Missing/invalid JWT token                  |
| **ForbiddenError**    | Logged in but no access | User trying to edit another's data         |
| **NotFoundError**     | Resource doesn't exist  | User ID not found in database              |
| **ConflictError**     | Resource already exists | Email already registered, duplicate key    |
| **UnavailableError**  | External service down   | Database offline, API timeout              |
| **InternalError**     | Unexpected error        | Null pointer, unhandled exception          |

## Files You Need to Know

```
packages/services/src/
├── errors.ts              ← All error classes
├── api-result.ts          ← ApiResult type + helpers
└── index.ts               ← Exports everything

.github/instructions/
└── api-contracts.instructions.md  ← Full documentation

packages/lists/src/
├── list-invites.service.ts  ← Service example
└── index.ts

packages/hono-rpc/src/routes/
└── invites.ts            ← Endpoint example
```

## Real Example: List Invites

### Service

```typescript
// packages/lists/src/list-invites.service.ts
export const sendListInviteSchema = z.object({
  listId: z.uuid(),
  invitedUserEmail: z.email(),
  invitingUserId: z.uuid(),
  baseUrl: z.string().url(),
});

export async function sendListInvite(
  params: z.infer<typeof sendListInviteSchema>,
): Promise<ListInvite> {
  const list = await db.query.list.findFirst({
    where: eq(list.id, params.listId),
  });

  if (!list) {
    throw new NotFoundError('List', { listId: params.listId });
  }

  const existingInvite = await db.query.listInvite.findFirst({
    where: and(
      eq(listInvite.listId, params.listId),
      eq(listInvite.invitedUserEmail, params.invitedUserEmail),
    ),
  });

  if (existingInvite && !existingInvite.accepted) {
    throw new ConflictError('Invite already exists', {
      listId: params.listId,
      email: params.invitedUserEmail,
    });
  }

  // ... create invite
  return createdInvite;
}
```

### Endpoint

```typescript
// packages/hono-rpc/src/routes/invites.ts
router.post('/invites/send', zValidator('json', sendListInviteSchema), async (ctx) => {
  try {
    const result = await sendListInvite(ctx.req.valid('json'));
    return ctx.json(success(result), 201);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return ctx.json(error('NOT_FOUND', err.message), 404);
    }
    if (err instanceof ConflictError) {
      return ctx.json(error('CONFLICT', err.message), 409);
    }
    if (isServiceError(err)) {
      return ctx.json(error(err.code, err.message), err.statusCode);
    }
    console.error('Unexpected error:', err);
    return ctx.json(error('INTERNAL_ERROR', 'Server error'), 500);
  }
});
```

### Client

```typescript
// React component
const result = await fetch('/invites/send', {
  method: 'POST',
  body: JSON.stringify({
    listId: 'abc-123',
    invitedUserEmail: 'user@example.com',
    invitingUserId: 'def-456',
    baseUrl: window.location.origin,
  }),
}).then((r) => r.json<ApiResult<ListInvite>>());

if (result.success) {
  console.log('Invite sent:', result.data.token);
} else {
  console.error('Failed:', result.message);
}
```

## Checklist for New Service

- [ ] Create Zod schema
- [ ] Export parameter type
- [ ] Write function with `Promise<ReturnType>` (no union)
- [ ] Throw typed errors
- [ ] Add JSDoc with `@throws`
- [ ] Export schema and type
- [ ] Create endpoint with try/catch
- [ ] Catch specific errors first
- [ ] Return `success()` or `error()`
- [ ] Add contract tests

## Getting Help

1. **Read the full guide:** `.github/instructions/api-contracts.instructions.md`
2. **Look at examples:** `packages/lists/src/list-invites.service.ts`
3. **Check error types:** `packages/services/src/errors.ts`
4. **Run tests:** See contract test examples in guide

## One More Thing

The key insight: **Services throw, endpoints catch, clients narrow.**

```
THROW (service)
  ↓
CATCH (endpoint)
  ↓
NARROW (client)
```

This pattern eliminates ambiguous unions, ensures type safety, and makes error handling explicit at every layer.

You've got this! 🚀
