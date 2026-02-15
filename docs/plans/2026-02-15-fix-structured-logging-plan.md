---
title: fix: replace console.* with structured logger
type: fix
date: 2026-02-15
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

### Still Using console.* ❌

| Location | Count | Priority |
|----------|-------|----------|
| `services/api/src/server.ts` | 3 | High |
| `services/api/src/lib/sentry.ts` | 2 | High |
| `packages/hono-rpc/src/middleware/error.ts` | 2 | High |
| `packages/hono-rpc/src/routes/*.ts` | ~50 | Medium |
| `packages/services/src/*.ts` | ~20 | Medium |
| `apps/*/app/lib/hooks/*.ts` | ~30 | Low |
| `packages/places/src/scripts/*.ts` | ~20 | Low |

## Proposed Solution

### Step 1: Fix Critical Paths (High Priority)

Replace `console.error` in error-handling code:

1. **services/api/src/server.ts**
   - Replace `console.error('[services/api] Error:', err)` with `logger.error()`
   - Replace `console.error('Failed to create server')` with `logger.error()`

2. **services/api/src/lib/sentry.ts**
   - Keep `console.warn` for missing Sentry (intentional early warning)
   - Consider using logger for initialization messages

3. **packages/hono-rpc/src/middleware/error.ts**
   - Replace `console.error` with `logger.error`

### Step 2: Fix API Routes (Medium Priority)

Replace `console.error` and `console.warn` in route handlers:

- `packages/hono-rpc/src/routes/places.ts` (~20 instances)
- `packages/hono-rpc/src/routes/vector.ts` (~7 instances)
- `packages/hono-rpc/src/routes/search.ts` (~3 instances)
- `packages/hono-rpc/src/routes/twitter.ts` (~2 instances)
- `packages/hono-rpc/src/routes/chats.ts` (~2 instances)
- `packages/hono-rpc/src/routes/bookmarks.ts` (~4 instances)

### Step 3: Fix Services (Medium Priority)

Replace in service files:

- `packages/services/src/` files using console.*

### Step 4: Client Apps (Low Priority)

Replace in React hooks:

- `apps/*/app/lib/hooks/*.ts` - these run in browser, console is fine
- Consider: Keep console.* in client code, only fix server-side

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

## Files to Modify

### High Priority

- [ ] `services/api/src/server.ts`
- [ ] `services/api/src/lib/sentry.ts` 
- [ ] `packages/hono-rpc/src/middleware/error.ts`

### Medium Priority

- [ ] `packages/hono-rpc/src/routes/places.ts`
- [ ] `packages/hono-rpc/src/routes/vector.ts`
- [ ] `packages/hono-rpc/src/routes/search.ts`
- [ ] `packages/hono-rpc/src/routes/twitter.ts`
- [ ] `packages/hono-rpc/src/routes/chats.ts`
- [ ] `packages/hono-rpc/src/routes/bookmarks.ts`

### Low Priority (Optional)

- [ ] Client-side hooks - keep using console.*
- [ ] Scripts - keep using console.*

## Acceptance Criteria

- [ ] No `console.error/warn/info/log` in server-side error handling paths
- [ ] All API routes use structured logger
- [ ] Services use structured logger
- [ ] Consistent log formatting across all services
- [ ] TypeScript compiles without errors
- [ ] Tests pass

## Dependencies

- `@hominem/utils/logger` - already exists, uses Pino
- `pino-pretty` - already in services/api for dev formatting

## Notes

- Client-side code (React hooks) should keep using `console.*` - browser console is appropriate there
- Scripts and one-off commands can keep using `console.*` for simplicity
- The logger already has redaction for sensitive fields (email, password, token)
