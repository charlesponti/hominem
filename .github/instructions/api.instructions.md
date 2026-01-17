---
applyTo: 'apps/api/**'
---

# API Development Guidelines

## Architecture

### API Structure

- **Framework:** Hono for HTTP server
- **RPC Layer:** tRPC for type-safe API
- **Database:** Drizzle ORM
- **Auth:** Supabase Auth

### Directory Structure

```
apps/api/src/
├── trpc/
│   ├── index.ts        # Root tRPC router
│   ├── context.ts      # Context creation
│   ├── middleware.ts   # Auth, logging, etc.
│   └── routers/        # Feature-specific routers
├── services/           # Business logic
├── middleware/         # HTTP middleware
└── index.ts            # Hono app entry
```

## tRPC Patterns

### Router Definition

```typescript
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const usersRouter = router({
  // Public endpoint
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
    }),

  // Protected endpoint (requires auth)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        bio: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // ctx.user is available in protected procedures
      const [updated] = await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id))
        .returning();

      return updated;
    }),
});
```

### Context Setup

```typescript
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getDb } from '@hominem/db';

export async function createContext(opts: FetchCreateContextFnOptions) {
  // Extract auth token from headers
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Verify token and get user
  const user = token ? await verifyToken(token) : null;

  return {
    db: getDb(),
    user,
    req: opts.req,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### Middleware

```typescript
import { TRPCError } from '@trpc/server';

// Auth middleware
export const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed to exist
    },
  });
});

// Protected procedure with auth
export const protectedProcedure = publicProcedure.use(isAuthenticated);
```

## Authentication Flow

### Supabase Auth Integration

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function verifyToken(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return user;
}
```

### Authorization Patterns

```typescript
// Check ownership
export const deletePost = protectedProcedure
  .input(z.object({ postId: z.string().uuid() }))
  .mutation(async ({ input, ctx }) => {
    const post = await ctx.db.query.posts.findFirst({
      where: eq(posts.id, input.postId),
    });

    if (!post) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    if (post.authorId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    await ctx.db.delete(posts).where(eq(posts.id, input.postId));
  });
```

## Error Handling

### tRPC Error Codes

- `BAD_REQUEST` - Invalid input
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Authenticated but not authorized
- `NOT_FOUND` - Resource doesn't exist
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `INTERNAL_SERVER_ERROR` - Unexpected errors

### Error Pattern

```typescript
import { TRPCError } from '@trpc/server';

try {
  // Operation
} catch (error) {
  if (error instanceof ValidationError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
```

## Input Validation

### Zod Schemas

```typescript
// Define reusable schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

const updateUserSchema = createUserSchema.partial();

// Use in procedures
export const createUser = publicProcedure
  .input(createUserSchema)
  .mutation(async ({ input, ctx }) => {
    // input is fully typed and validated
    return ctx.db.insert(users).values(input).returning();
  });
```

### Input Sanitization

- Validate all inputs with Zod
- Sanitize HTML content
- Validate file uploads
- Check for SQL injection attempts (Drizzle prevents this, but validate input)

## Response Patterns

### Consistent Response Structure

```typescript
// Success
return { data: user };

// With metadata
return {
  data: users,
  meta: {
    total: count,
    page: input.page,
    pageSize: input.pageSize,
  },
};
```

### Pagination

```typescript
export const listUsers = publicProcedure
  .input(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }),
  )
  .query(async ({ input, ctx }) => {
    const offset = (input.page - 1) * input.pageSize;

    const [users, [{ count }]] = await Promise.all([
      ctx.db.select().from(usersTable).limit(input.pageSize).offset(offset),
      ctx.db.select({ count: sql<number>`count(*)` }).from(usersTable),
    ]);

    return {
      data: users,
      meta: {
        total: count,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(count / input.pageSize),
      },
    };
  });
```

## Performance & Optimization

### Query Optimization

- Use database indexes for frequently queried fields
- Avoid N+1 queries - use joins or batching
- Implement pagination for large datasets
- Use database-level filtering instead of filtering in memory

### Caching

- Cache expensive computations
- Use Redis for session data
- Implement cache invalidation strategies

### Rate Limiting

- Implement rate limiting per endpoint
- Use sliding window or token bucket algorithms
- Provide clear rate limit headers

## Security Best Practices

### Input Validation

- Validate ALL inputs with Zod
- Sanitize user-generated content
- Validate file types and sizes

### Authentication & Authorization

- Always verify JWT tokens
- Implement proper RBAC where needed
- Check resource ownership before mutations

### Data Protection

- Never expose sensitive data in responses
- Hash passwords with bcrypt/argon2
- Use HTTPS only
- Implement CORS properly

### Logging & Monitoring

- Log all authentication attempts
- Log errors with context
- Monitor for suspicious activity
- Never log sensitive data (passwords, tokens)

## Testing API Endpoints

- Test with tRPC's test helpers
- Mock database calls in unit tests
- Use real database in integration tests
- Test authentication and authorization
- Test error cases
- Test input validation
