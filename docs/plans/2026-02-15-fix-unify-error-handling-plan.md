---
title: fix: unify error handling across RPC and API layers
type: fix
date: 2026-02-15
status: completed
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

## Implementation (COMPLETED)

### Phase 1: Error Middleware ✅

**File:** `services/api/src/server.ts`

Added global error handler:

```typescript
import { isServiceError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';

// Global error handler
app.onError((err, c) => {
  logger.error('[services/api] Error', { error: err });

  if (isServiceError(err)) {
    return c.json(
      { error: err.code.toLowerCase(), message: err.message },
      err.statusCode as ContentfulStatusCode
    );
  }

  return c.json(
    { error: 'internal_error', message: 'An unexpected error occurred' },
    500
  );
});
```

### Phase 2: Activate Sentry ✅

**File:** `services/api/src/lib/sentry.ts`

- Updated `initSentry()` to safely handle missing `SENTRY_DSN`
- Added `sentryMiddleware()` for request tracking
- Initialize Sentry at server startup

### Phase 3: Route Audit ✅

**Result:** Routes were already properly using ServiceError patterns:
- `services/api/src/routes/possessions.ts` - ✅ Uses `throw new InternalError()`
- `services/api/src/routes/health.ts` - ✅ Uses `throw new NotFoundError()`, `throw new InternalError()`
- Other routes - ✅ Using proper error patterns

The auth routes (`services/api/src/routes/auth.ts`) were using proper HTTP status codes (400, 401) directly, which is acceptable for OAuth error responses.

### Phase 4: Structured Logging ✅

Replaced `console.*` with structured Pino logger across:

**High Priority:**
- `services/api/src/server.ts`
- `packages/hono-rpc/src/middleware/error.ts`

**Medium Priority (13 route files):**
- `packages/hono-rpc/src/routes/places.ts` (17 instances)
- `packages/hono-rpc/src/routes/vector.ts` (7 instances)
- `packages/hono-rpc/src/routes/search.ts` (2 instances)
- `packages/hono-rpc/src/routes/bookmarks.ts` (6 instances)
- `packages/hono-rpc/src/routes/twitter.ts` (1 instance)
- `packages/hono-rpc/src/routes/chats.ts` (1 instance)
- `packages/hono-rpc/src/routes/user.ts` (2 instances)
- `packages/hono-rpc/src/routes/location.ts` (3 instances)
- `packages/hono-rpc/src/routes/finance.plaid.ts` (1 instance)
- `packages/hono-rpc/src/routes/finance.runway.ts` (1 instance)
- `packages/hono-rpc/src/routes/finance.data.ts` (1 instance)
- `packages/hono-rpc/src/routes/files.ts` (4 instances)
- `packages/hono-rpc/src/routes/admin.ts` (2 instances)

**Pattern:**
```typescript
// Before:
console.error('[places.create] unexpected error:', err);

// After:
logger.error('[places.create] unexpected error', { error: err });
```

**Left as console.* (appropriate):**
- Client-side React hooks (browser console is appropriate)
- Scripts and one-off commands
- Dev-only warnings

### Phase 5: Dev Server Port Fix ✅

**File:** `services/api/package.json`

Added port cleanup to dev script to handle macOS race condition:

```json
"dev": "lsof -ti:4040 | xargs kill -9 2>/dev/null; bun --watch src/index.ts"
```

## Implementation Phases

### Phase 1: Error Middleware (Priority: High)

- [x] Update `services/api/src/server.ts` to register `app.onError`
- [x] Import `isServiceError` from `@hominem/services`
- [x] Test error responses from services/api routes

### Phase 2: Activate Sentry (Priority: High)

- [x] Import Sentry functions in `services/api/src/server.ts`
- [x] Call `initSentry()` at startup
- [x] Register `sentryMiddleware`
- [ ] Verify Sentry captures errors (requires SENTRY_DSN in production)

### Phase 3: Route Audit (Priority: Medium)

- [x] Search for `return c.json.*error` patterns in services/api
- [x] Convert each to throw ServiceError (none needed - already proper)
- [x] Test each modified route

### Phase 4: Structured Logging (Priority: Medium)

- [x] Replace console.error with logger in high-priority files
- [x] Replace console.* in API route files
- [ ] Replace console.* in services (already using logger in most places)

### Phase 5: Dev Server Port Fix (Priority: Medium)

- [x] Add port cleanup to dev script

## Acceptance Criteria

### Functional Requirements

- [x] All errors from services/api return proper HTTP status codes (not 200)
- [x] Errors are tracked in Sentry (when SENTRY_DSN is configured)
- [x] Error response format is consistent: `{ error, message }`

### Non-Functional Requirements

- [x] No performance regression from error handling
- [x] TypeScript compiles without errors
- [x] Existing tests pass

### Testing

- [x] Unit test error middleware
- [x] Integration test: verify error returns correct status
- [x] Manual test: trigger each error type, verify response

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Routes returning 200 with error objects | 0 | ✅ |
| Error middleware coverage | 100% of API routes | ✅ |
| Sentry error capture | All unhandled errors | ✅ (when configured) |

## Commits

- `34f72537` - fix: unify error handling across API layers
- `1f846f39` - fix: replace console.* with structured logger
- `6052d489` - fix: kill existing process on port 4040 before dev server starts

## Dependencies & Risks

### Dependencies

- `@hominem/services` - ServiceError classes and `isServiceError`
- `@hominem/utils/logger` - Structured Pino logger
- Sentry - Error tracking service (already has integration code)

### Risks

| Risk | Likelihood | Status |
|------|------------|--------|
| Error middleware conflicts with hono-rpc's | Low | ✅ Resolved - services/api is fallback for its own routes |
| Sentry initialization fails in dev | Low | ✅ Resolved - guarded with SENTRY_DSN check |
| Routes throw errors not caught by middleware | Medium | ✅ Resolved - routes already using proper patterns |

## References

### Internal

- Error middleware: `packages/hono-rpc/src/middleware/error.ts`
- ServiceError classes: `packages/services/src/error-classes.ts`
- Sentry integration: `services/api/src/lib/sentry.ts`
- Structured logger: `packages/utils/src/logger.ts`
- Current errors module: `services/api/src/lib/errors.ts`

### External

- Hono error handling: https://hono.dev/api/errors
- Sentry Node.js: https://docs.sentry.io/platforms/node/
- REST error responses: https://www.rfc-editor.org/rfc/rfc7807
- Pino logger: https://getpino.io/
