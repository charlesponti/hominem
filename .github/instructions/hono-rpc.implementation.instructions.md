---
applyTo: 'packages/hono-rpc/**, services/api/**, packages/**/src/routes/**'
---

Purpose
- Practical patterns and rules for building and migrating routes to Hono RPC with explicit types and consistent error/validation handling.

Rules & patterns
- Always import `type AppEnv` from server and type the Hono instance: `new Hono<AppEnv>()`.
 - For canonical input validation and API envelope patterns see `.github/instructions/api-contracts.instructions.md` (Zod schemas, `success()`/`error()` helpers). Hono-specific helper: call `c.req.valid('json')` for typed inputs.
- Serialize Date objects to ISO strings before returning JSON.

Example route
```typescript
import { Hono } from 'hono'
import type { AppEnv } from '../server'
import { zValidator } from '@hono/zod-validator'
import type { PlaceCreateInput, PlaceCreateOutput } from '../types/places.types'

export const placesRoutes = new Hono<AppEnv>()
  .post('/create', zValidator('json', placeCreateInputSchema), async (c) => {
    const input = c.req.valid('json') as PlaceCreateInput
    const place = await placeService.create(input)
    return c.json<PlaceCreateOutput>({ success: true, data: serialize(place) }, 201)
  })
```

Verification
- `bun run typecheck` passes for packages/hono-rpc
- No remaining `@trpc` imports: `rg "@trpc|@hominem/trpc" packages || true`

Migration checklist
- [ ] Create `packages/hono-rpc/src/routes/*` and `types/*`
- [ ] Migrate router by router, keep tRPC as fallback until complete
- [ ] Add deprecation notice in `packages/trpc` exports
