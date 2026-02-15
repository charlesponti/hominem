---
title: fix: unify error handling across RPC and API layers
type: fix
date: 2026-02-15
---

# Unify Error Handling Across RPC and API Layers

## Overview

Fix error handling to ensure all API endpoints return proper HTTP error status codes (4xx, 5xx) instead of 200 with error objects. This involves activating Sentry for error tracking, registering error middleware in services/api, and auditing routes for improper error responses.

## Problem Statement

Currently, error handling is inconsistent across the two API layers:

1. **hono-rpc** (`packages/hono-rpc`): ✅ Has proper error middleware that returns HTTP error status codes
2. **services/api** (`services/api`): ❌ Missing error middleware registration, relies on hono-rpc's middleware

Additionally:
- Sentry error tracking is defined but not activated
- Some routes return `{ error: ... }` with HTTP 200 instead of throwing proper errors

## Architecture Analysis

### Current Flow

```
Client Request
     │
     ▼
services/api server.ts (NO error middleware!)
     │
     ├── /api/status, /api/health, /api/auth, /api/possessions, etc.
     │   (These routes throw ServiceError but no middleware catches them)
     │
     ▼
hono-rpc mounted at '/'
     │
     └── errorMiddleware (catches ServiceError, returns proper HTTP status)
         │
         └── /api/finance, /api/lists, /api/places, etc.
```

### Issues

| Layer | Issue | Impact |
|-------|-------|--------|
| services/api | No `app.onError()` registered | Unhandled errors may leak or return wrong status |
| services/api | Sentry not activated | No production error tracking |
| services/api | Some routes return 200 with error objects | Clients can't detect errors via HTTP status |
| Both | No structured logging | Hard to aggregate/alert on errors |

## Proposed Solution

### Phase 1: Register Error Middleware in services/api

**File:** `services/api/src/server.ts`

Add global error handler that:
1. Catches thrown errors
2. Returns proper HTTP status codes
3. Logs errors

```typescript
// Add after middleware registration, before routes
app.onError((err, c) => {
  console.error('[API Error]', err);
  
  if (isServiceError(err)) {
    return c.json(
      { error: err.code.toLowerCase(), message: err.message },
      err.statusCode
    );
  }
  
  return c.json({ error: 'internal_error', message: 'An unexpected error occurred' }, 500);
});
```

### Phase 2: Activate Sentry

**File:** `services/api/src/server.ts`

1. Import and call `initSentry()` at startup
2. Register `sentryMiddleware` 
3. Register `sentryErrorHandler`

This provides:
- Error tracking in production
- Request tracing
- Performance monitoring

### Phase 3: Audit and Fix Route Error Responses

Find and fix routes that return error objects with 200:

```bash
# Find patterns like: return c.json({ error: ... })
grep -r "c\.json.*error" services/api/src/routes/
```

Convert to:
```typescript
// From:
return c.json({ error: 'Not found' }, 404);

// To:
throw new NotFoundError('Not found');
```

## Technical Approach

### Step 1: Update services/api/server.ts

Add error middleware after line 83 (after auth middleware):

```typescript
// services/api/src/server.ts:84-100
import { isServiceError } from '@hominem/services';

// Global error handler
app.onError(async (err, c) => {
  console.error('[services/api] Error:', err);

  if (isServiceError(err)) {
    return c.json(
      {
        error: err.code.toLowerCase(),
        message: err.message,
      },
      err.statusCode
    );
  }

  return c.json(
    {
      error: 'internal_error',
      message: 'An unexpected error occurred',
    },
    500
  );
});
```

### Step 2: Activate Sentry in services/api

In `services/api/src/server.ts`:

```typescript
import { initSentry, sentryMiddleware, sentryErrorHandler } from './lib/sentry';

// At startup (around line 116)
initSentry();

// After logger middleware, before routes
app.use('*', sentryMiddleware());

// After onError
app.onError(sentryErrorHandler());
```

### Step 3: Audit routes

Files to audit (based on earlier grep):

- `services/api/src/routes/possessions.ts`
- `services/api/src/routes/health.ts`
- `services/api/src/routes/invites.incoming.ts`
- `services/api/src/routes/invites.outgoing.ts`
- `services/api/src/routes/finance/finance.categories.ts`
- `services/api/src/routes/finance/plaid/finance.plaid.exchange-token.ts`
- `services/api/src/routes/finance/plaid/finance.plaid.disconnect.ts`
- `services/api/src/routes/finance/plaid/finance.plaid.create-link-token.ts`
- `services/api/src/routes/components/index.ts`

Each route using patterns like:
```typescript
return c.json({ error: 'message' }, 404);
```

Should become:
```typescript
throw new NotFoundError('message');
```

Ensure proper import:
```typescript
import { NotFoundError, ValidationError, InternalError, isServiceError } from '@hominem/services';
```

## Implementation Phases

### Phase 1: Error Middleware (Priority: High)

- [ ] Update `services/api/src/server.ts` to register `app.onError`
- [ ] Import `isServiceError` from `@hominem/services`
- [ ] Test error responses from services/api routes

### Phase 2: Activate Sentry (Priority: High)

- [ ] Import Sentry functions in `services/api/src/server.ts`
- [ ] Call `initSentry()` at startup
- [ ] Register `sentryMiddleware`
- [ ] Register `sentryErrorHandler`
- [ ] Verify Sentry captures errors

### Phase 3: Route Audit (Priority: Medium)

- [ ] Search for `return c.json.*error` patterns in services/api
- [ ] Convert each to throw ServiceError
- [ ] Test each modified route

### Phase 4: Structured Logging (Priority: Low - Future)

- [ ] Consider replacing console.error with Pino
- [ ] Add error rate metrics

## Acceptance Criteria

### Functional Requirements

- [ ] All errors from services/api return proper HTTP status codes (not 200)
- [ ] Errors are tracked in Sentry (when configured)
- [ ] Error response format is consistent: `{ error, message }`

### Non-Functional Requirements

- [ ] No performance regression from error handling
- [ ] TypeScript compiles without errors
- [ ] Existing tests pass

### Testing

- [ ] Unit test error middleware
- [ ] Integration test: verify error returns correct status
- [ ] Manual test: trigger each error type, verify response

## Success Metrics

| Metric | Target |
|--------|--------|
| Routes returning 200 with error objects | 0 |
| Error middleware coverage | 100% of API routes |
| Sentry error capture | All unhandled errors |

## Dependencies & Risks

### Dependencies

- `@hominem/services` - ServiceError classes and `isServiceError`
- Sentry - Error tracking service (already has integration code)

### Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Error middleware conflicts with hono-rpc's | Low | hono-rpc handles its own errors; services/api is fallback |
| Sentry initialization fails in dev | Low | Guard with `if (env.SENTRY_DSN)` |
| Routes throw errors not caught by middleware | Medium | Test each route's error path |

## References

### Internal

- Error middleware: `packages/hono-rpc/src/middleware/error.ts`
- ServiceError classes: `packages/services/src/error-classes.ts`
- Sentry integration: `services/api/src/lib/sentry.ts`
- Current errors module: `services/api/src/lib/errors.ts`

### External

- Hono error handling: https://hono.dev/api/errors
- Sentry Node.js: https://docs.sentry.io/platforms/node/
- REST error responses: https://www.rfc-editor.org/rfc/rfc7807
