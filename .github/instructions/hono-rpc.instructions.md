---
applyTo: 'packages/hono-rpc/**, services/api/**, apps/**/lib/**'
---

# Hono RPC Implementation Guide

## Why follow this pattern
- Hono replaced the old tRPC routers to reduce TS instantiation counts from ~10,000 to <100 while shrinking memory and bundle size (see docs/HONO_RPC_IMPLEMENTATION.md).
- This package must stay types-first: every route should be `new Hono<AppEnv>()`, explicitly typed with `AppEnv` from `../server` or the package entrypoint.
- All services now rely on the API architecture described in docs/API_ARCHITECTURE.md, so routes must return direct REST responses with `success()`/`error()` helpers and well-defined HTTP codes.

## Core route conventions
1. **AppEnv + middleware**: Always type the Hono instance (`new Hono<AppEnv>()`). Import and apply `authMiddleware` or other shared middleware before your handler when the endpoint is protected.
2. **Validation**: Use `zValidator('json', schema)` or the appropriate `zValidator` flavor to gate inputs and convert them to typed `c.req.valid('json')` values.
3. **Error handling**: Wrap handler logic in `try/catch`, log unexpected errors (with `console.error('[route] error', err)`), then return `c.json(error('ERROR_CODE', 'message'), statusCode)` with the matching HTTP status (400/401/403/404/409/500, etc.).
4. **Success payloads**: Return `c.json(success(serializePayload(data)), statusCode)` where `serializePayload` converts `Date` objects to ISO strings and strips circular references as needed.
5. **Response helpers**: Import and reuse the shared `success`/`error` helpers from `@hominem/services` so responses stay consistent with the API architecture pivot described in docs/API_ARCHITECTURE.md#part-4-the-pivot---phase-4-execution.

## Route template
```typescript
import type { AppEnv } from '../server'
import { success, error } from '@hominem/services'
import { zValidator } from '@hono/zod-validator'

export const exampleRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    try {
      const data = await serviceList()
      return c.json(success(serializeDates(data)), 200)
    } catch (err) {
      console.error('[example] error', err)
      return c.json(error('UNKNOWN_ERROR', 'Failed to list items'), 500)
    }
  })
  .post('/', zValidator('json', schema), async (c) => {
    try {
      const input = c.req.valid('json')
      const created = await serviceCreate(input)
      return c.json(success(serializeDates(created)), 201)
    } catch (err) {
      console.error('[example] error', err)
      return c.json(error('UNKNOWN_ERROR', 'Creation failed'), 500)
    }
  })
```

## Migration checklist (for new or updated routes)
- [ ] Confirm the service being called now throws typed errors (see docs/API_ARCHITECTURE.md Part 2). If not, add a new typed error class.
- [ ] Route imports `AppEnv`, `success`, `error`, and `zValidator` and uses them consistently.
- [ ] Protected endpoints wrap handlers with `authMiddleware`/`requireUser` before business logic.
- [ ] All request bodies/responses sanitize or stringify `Date` fields before returning them (see serialization example in docs/HONO_RPC_IMPLEMENTATION.md#phase-3-type-safety-fixes).
- [ ] Errors map to status codes per the API architecture (validation → 400, unauthorized → 401, forbidden → 403, not found → 404, conflict → 409, catch-all → 500).
- [ ] Unit or integration tests cover success + error flows for the route and confirm `success()` return values match exported shapes.
- [ ] If migrating from trpc, remove old imports, keep compatibility shims minimal, and drop `@trpc` dependencies once all routes are ported (see migration summary in docs/HONO_RPC_IMPLEMENTATION.md Phase 1-3).

## Testing & CI expectations
- Running `bun run typecheck` should still succeed within the <1s gate because new routes avoid deep inference (per migration goals in docs/HONO_RPC_IMPLEMENTATION.md). If you add a new package or route, add a type-perf test entry if the change affects instrumentation counts.
- Add or update Vitest/api tests to exercise both success and failure branches. Tests should assert values returned by `success()` and that the HTTP status matches the intended semantics.
- Document any new route surface area in docs/HONO_RPC_IMPLEMENTATION.md or docs/API_ARCHITECTURE.md, especially if you introduce a new domain boundary (e.g., new base path under `/api`).

## Docs & references
- Use docs/HONO_RPC_IMPLEMENTATION.md for migration lessons, success metrics, and API wiring templates.
- Use docs/API_ARCHITECTURE.md for error-handling rationale and HTTP status mapping.

## Related tooling
- Run the Hono route linter agent (hono-check) before merging to ensure the conventions above stay enforced.
- Keep shared helpers in `packages/hono-rpc/src/utils/` updated when new serialization or response helpers are needed.
