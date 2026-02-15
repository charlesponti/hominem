---
title: fix: replace console.* with structured logger
type: fix
date: 2026-02-15
status: completed
---

# Replace Console Logging with Structured Logger

## Overview

Replace direct `console.error/warn/log` calls throughout the codebase with the existing structured logger from `@hominem/utils/logger`. This enables log aggregation, better formatting, and consistent log levels in production.

## Problem Statement

The codebase has ~477 instances of direct `console.*` calls, but a structured Pino logger already exists at `@hominem/utils/logger`. Many services already use it correctly, but critical paths (error handling, API routes) still use `console.error`.

## Current State

### Already Using Structured Logger ✅ (~39 files)

- Services: `finance`, `places`, `lists`, `chat`, `jobs`, `workers`
- Some API routes: `websocket`, `redis`, `email`

### Completed ✅

All planned console.* replacements completed:
- `services/api/src/server.ts`
- `services/api/src/lib/sentry.ts` (kept for startup messages)
- `packages/hono-rpc/src/middleware/error.ts`
- `packages/hono-rpc/src/routes/*.ts` (13 route files)
- `services/api/src/routes/*.ts` (20 route files)
- `services/api/src/middleware/*.ts`
- `services/api/src/lib/*.ts`

### Left as console.* (appropriate)

- Client-side React hooks (browser console is appropriate)
- Scripts and one-off commands
- Server startup messages
- Worker uncaught exception handlers

## Implementation

### Import Pattern

```typescript
import { logger } from '@hominem/utils/logger';
```

### Replace Console Calls

```typescript
// Before:
console.error('[places.create] unexpected error:', err);

// After:
logger.error('[places.create] unexpected error', { error: err });
```

### Log Level Guidelines

| Level | Use Case |
|-------|----------|
| `error` | Failures, exceptions, unhandled errors |
| `warn` | Expected failures, deprecated usage, retry exhaustion |
| `info` | Important events: server start, significant operations |
| `debug` | Detailed flow: request/response, intermediate steps |

## Files Modified

### High Priority ✅

- [x] `services/api/src/server.ts`
- [x] `services/api/src/lib/sentry.ts` (kept startup messages as console)
- [x] `packages/hono-rpc/src/middleware/error.ts`

### Medium Priority ✅

- [x] `packages/hono-rpc/src/routes/places.ts`
- [x] `packages/hono-rpc/src/routes/vector.ts`
- [x] `packages/hono-rpc/src/routes/search.ts`
- [x] `packages/hono-rpc/src/routes/twitter.ts`
- [x] `packages/hono-rpc/src/routes/chats.ts`
- [x] `packages/hono-rpc/src/routes/bookmarks.ts`
- [x] `packages/hono-rpc/src/routes/user.ts`
- [x] `packages/hono-rpc/src/routes/location.ts`
- [x] `packages/hono-rpc/src/routes/finance.runway.ts`
- [x] `packages/hono-rpc/src/routes/finance.data.ts`
- [x] `packages/hono-rpc/src/routes/finance.plaid.ts`
- [x] `packages/hono-rpc/src/routes/files.ts`
- [x] `packages/hono-rpc/src/routes/admin.ts`
- [x] `services/api/src/routes/images.ts`
- [x] `services/api/src/routes/possessions.ts`
- [x] `services/api/src/routes/health.ts`
- [x] `services/api/src/routes/invites.incoming.ts`
- [x] `services/api/src/routes/invites.outgoing.ts`
- [x] `services/api/src/routes/status.ts`
- [x] `services/api/src/routes/components/index.ts`
- [x] `services/api/src/routes/finance/finance.categories.ts`
- [x] `services/api/src/routes/finance/finance.import.ts`
- [x] `services/api/src/routes/finance/plaid/*.ts`
- [x] `services/api/src/routes/oauth/oauth.twitter.callback.ts`
- [x] `services/api/src/routes/ai/ai.tour.ts`
- [x] `services/api/src/middleware/supabase.ts`
- [x] `services/api/src/middleware/file-upload.ts`
- [x] `services/api/src/lib/plaid.ts`
- [x] `services/api/src/lib/errors.ts`

### Low Priority (Optional) - Skipped ✅

- [x] Client-side hooks - keep using console.*
- [x] Scripts - keep using console.*

## Acceptance Criteria

- [x] No `console.error/warn` in server-side error handling paths
- [x] All API routes use structured logger
- [x] Services use structured logger
- [x] Consistent log formatting across all services
- [x] TypeScript compiles without errors
- [x] Tests pass

## Commits

- `1f846f39` - fix: replace console.* with structured logger
- `bb37d911` - fix: replace console with structured logger in services/api
- `8297f9d3` - fix: replace remaining console.* in hono-rpc (context middleware, plaid lib)
- `f35a2fa5` - docs: mark error handling plan as complete

## Remaining console.* (Appropriate)

The following are intentionally kept as `console.*` because they're appropriate for their context:

| File | Count | Reason |
|------|-------|--------|
| `services/api/src/lib/sentry.ts` | 2 | Sentry init messages before logger ready |
| `services/api/src/index.ts` | 1 | Server startup message (one-time) |
| `services/workers/src/index.ts` | 2 | Worker uncaught exception handlers (process-level) |

## Dependencies

- `@hominem/utils/logger` - already exists, uses Pino
- `pino-pretty` - already in services/api for dev formatting

## Notes

- Client-side code (React hooks) should keep using `console.*` - browser console is appropriate there
- Scripts and one-off commands can keep using `console.*` for simplicity
- The logger already has redaction for sensitive fields (email, password, token)
