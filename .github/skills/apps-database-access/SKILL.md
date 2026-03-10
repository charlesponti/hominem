---
name: apps-database-access
description: Use for code inside `apps/**` when touching data access. Enforces RPC-only app access and forbids direct DB imports.
---

# Database Access For Apps

## Core Rule

Applications must not import from `@hominem/db` directly.

Only the RPC layer may access the database. Apps must use `@hominem/hono-client` and API contract types from `@hominem/hono-rpc`.

## Allowed Imports

- `@hominem/hono-client`
- `@hominem/hono-rpc`
- `@hominem/hono-rpc/types`

## Forbidden Imports

- `@hominem/db`
- `@hominem/db/schema/*`
- `@hominem/db/types/*`
- any database-internal structure or type from app code

## Correct Pattern

```ts
import { useHonoQuery } from '@hominem/hono-client/react'
import type { TaskStatus } from '@hominem/hono-rpc/types'

export function useTasks() {
  return useHonoQuery(['tasks'], async (client) => {
    const res = await client.api.tasks.$get()
    return res.json()
  })
}
```

## Validation

Run:

```bash
bun run validate-db-imports
bun run check
```
