---
name: hominem-resource
kind: skill
tags:
  - api
  - schema
  - mcp
  - rpc
  - zod
  - web
description: >
  Add a new resource (domain) to the hominem API: shared Zod schemas in
  services/api/src/schemas, one implementation in
  services/api/src/application/*.service.ts, thin adapters that reuse it — an
  MCP tool in services/api/src/mcp/tools and Hono RPC routes in
  services/api/src/rpc/routes — a typed client layer in packages/rpc/src/types
  when apps/web or apps/omiro needs to consume it, plus integration tests. Use
  when adding a feature that must be reachable over MCP and/or HTTP/RPC and/or
  a web UI, or when reviewing whether new tool/route/hook code follows the
  shared-implementation pattern.
license: MIT
compatibility: Hominem API service work, optionally extending into apps/web.
metadata:
  author: project
  version: "1.1"
  category: API
when:
  - adding a resource that must be reachable over MCP and/or HTTP/RPC and/or a web UI
  - reviewing whether new tool/route/hook code follows the shared-implementation pattern
  - adding Zod schemas, an application service, RPC types, or integration tests in hominem
termination:
  - MCP, RPC, and (if applicable) the web hook are thin adapters over the one shared implementation
  - Integration tests (and, for multi-user web flows, e2e tests) pass for the new resource
outputs:
  - Shared schema + service implementation, adapter surfaces, and (if applicable) RPC types + web hook
argumentHint: the resource (domain) to add to the hominem API
---

# Add an API resource to hominem

A resource (e.g. `calendar`, `people`, `career`) is exposed over **two required outward
surfaces, plus an optional third**:

1. **MCP tools** — `services/api/src/mcp/tools/*.ts`, called by AI clients via `callTool`.
2. **RPC routes** — `services/api/src/rpc/routes/*.ts`, plain HTTP JSON under `/api`, called by web/mobile clients.
3. **Web/mobile client types + hook** (optional, step 6) — `packages/rpc/src/types/*.ts` +
   `apps/web/app/hooks/use-*.ts`, when `apps/web`/`apps/omiro` needs to consume the resource.

**Golden rule: MCP and RPC are thin adapters over ONE shared implementation.** Both surfaces import
the _same_ Zod schemas from `services/api/src/schemas/` and the _same_ query logic from
`services/api/src/application/*.service.ts`. Never fork query logic or schemas between the two —
a change to a resource's behavior must be a single edit in the application layer, verified by a
single test suite, and both surfaces pick it up for free.

Layered dependency direction (never the reverse):

```
DB (packages/db)  →  schemas/  ←  application/*.service.ts  →  mcp/tools  AND  rpc/routes
                        ↑                                            ↑  (both import service + schemas)
                        └──── shared Zod schemas ────────────────────┘
```

## Where files live

| Layer      | Path                                                                                                                                                       | Owns                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Schema     | `services/api/src/schemas/<domain>.schema.ts`                                                                                                              | Zod input/output shapes (the single contract)  |
| Service    | `services/api/src/application/<domain>.service.ts`                                                                                                         | All query/business logic, `ownerUserId`-scoped |
| MCP tool   | `services/api/src/mcp/tools/<domain>.ts`                                                                                                                   | `registerTool` wiring only                     |
| RPC routes | `services/api/src/rpc/routes/<domain>.ts`                                                                                                                  | Hono route wiring only                         |
| RPC types  | `packages/rpc/src/types/<domain>.types.ts` (optional)                                                                                                      | `InferResponseType`/`InferRequestType` only, never hand-written |
| Web hook   | `apps/web/app/hooks/use-<domain>.ts` (optional)                                                                                                            | `useQuery`/`useMutation` wiring only            |
| Tests      | `services/api/src/application/<domain>.service.test.ts`, `services/api/src/mcp/tools/<domain>.test.ts`, `services/api/src/rpc/routes/<domain>.test.ts`, optional `services/api/src/schemas/<domain>.schema.test.ts`, optional `apps/web/tests/e2e/<domain>.spec.ts` | Behavior verification                          |

## Workflow

1. **Schema first.** If the resource needs new tables/columns, run the Goose migration workflow:
   write the migration, then `just db migrate` + `just db codegen`
   (and `just db migrate test` for the test DB). Column names in code are the camelCased
   snake_case columns from `packages/db/src/types/database.ts` (e.g. `owner_userId` →
   `ownerUserid`, `start_date` → `startDate`).
2. **Define the shared Zod schemas** in `schemas/<domain>.schema.ts`:
   - One output schema per resource shape; one input schema per operation.
   - Reuse existing helpers (e.g. `limitSchema`, `isoDateSchema`, `fromBeforeTo`) — copy the
     idiom from `schemas/calendar.schema.ts` or `schemas/people.schema.ts` rather than inventing
     new validation.
   - MCP `outputSchema` must match the service's return shape **exactly** — `callTool` re-parses
     the service result against it and throws on mismatch. Use `.nullable()` where the DB can
     return `null`.
3. **Write ONE service implementation** in `application/<domain>.service.ts`:
   - Export functions like `getX({ ownerUserId, ...input })`. Read the caller from the first
     argument — it is always available from MCP (`ownerUserId`) and RPC (`c.get('auth')!.userId`).
   - Use `db` from `@hominem/db` (Kysely with `CamelCasePlugin`). Refer to tables with the
     `app.` prefix (`app.people`, `app.events`, ...). `app.*` tables are RLS-forced; the service
     role bypasses RLS, so **scope every query by `ownerUserid`** — a caller must never see
     another user's rows.
   - Throw typed errors from `@hominem/db` (`NotFoundError`, `ValidationError`, ...) rather than
     returning error shapes; both adapters surface them consistently.
   - Keep list results bounded (apply a `limit`) so the MCP `resultCap` never trips.
   - Timestamps come back as raw Postgres strings (e.g. `2026-07-10 09:00:00+00`), not ISO,
     because `packages/db/src/db.ts` registers pg type parsers that return strings. Design your
     schema/tests around that.
4. **MCP adapter** (`mcp/tools/<domain>.ts`): register one tool per operation with
   `registerTool`, calling the service function directly:

   ```ts
   import { getCalendarEvents } from '../../application/calendar.service';
   import {
     calendarEventsInputSchema,
     calendarEventsOutputSchema,
   } from '../../schemas/calendar.schema';
   import { registerTool } from '../tools';

   registerTool(
     {
       name: 'calendar_events',
       title: 'List calendar events',
       description: 'Lists calendar events in a window, newest first.',
       inputSchema: calendarEventsInputSchema,
       outputSchema: calendarEventsOutputSchema,
       readOnly: true,
       scopes: ['calendar:read'],
       sensitivity: 'sensitive', // or 'standard' for non-personal data
       resultCap: 50, // must be >= every array field's max length
     },
     async (ownerUserId, input) => getCalendarEvents({ ownerUserId, ...input }),
   );
   ```

   Wire the scope(s) in three places (see `calendar:read` / `travel:read` as the precedent):
   - `services/api/src/auth/better-auth.ts` — add the scope to the `MCP_SCOPES` array.
   - `services/api/src/mcp/routes.ts` — gate the tool file import on the scope:
     `if (enabledScopes.size === 0 || enabledScopes.has('<scope>')) { await import('./tools/<domain>'); }`
   - The tool's own `scopes` array — `mcp/server.ts` enforces that the caller holds **every**
     listed scope (`hasRequiredScopes` uses `every`). A cross-domain tool (e.g. `person_timeline`
     reads people + calendar + travel) must list all of them.

5. **RPC adapter** (`rpc/routes/<domain>.ts`): Hono routes calling the same service.
   - Response shape: `return c.json(outputSchema.parse(result));` — flat, no envelope. This is the
     convention in `tasks.ts`, `notes.ts`, `collections.ts`, `chats.ts`, and every other route file
     but one.
   - Do NOT use `parseDataEnvelope`/`{ data }` (`../response`) for a new resource. It exists for
     exactly one legacy route (`personal.ts`). Copying it for a new resource is a defect.

   ```ts
   import { zValidator } from '@hono/zod-validator';
   import { Hono } from 'hono';

   import { getCalendarEvents } from '../../application/calendar.service';
   import {
     calendarEventsInputSchema,
     calendarEventsOutputSchema,
   } from '../../schemas/calendar.schema';
   import { authMiddleware, type AppContext } from '../middleware/auth';

   const routes = new Hono<AppContext>().use('*', authMiddleware);

   routes.get('/calendar/events', zValidator('query', calendarEventsInputSchema), async (c) => {
     const userId = c.get('auth')!.userId;
     const input = c.req.valid('query');
     const events = await getCalendarEvents({ ownerUserId: userId, ...input });
     return c.json(calendarEventsOutputSchema.parse(events));
   });

   export const calendarRoutes: Hono<AppContext> = routes;
   ```

   Mount it in `services/api/src/rpc/app.ts`:
   `import { calendarRoutes } from './routes/calendar';` then
   `.route('', calendarRoutes)` (prefixed routes use `.route('/prefix', ...)`).
   Route handlers must be one-liners that delegate to the service — no query logic in the route.
   No status code arg to `c.json()` means Hono defaults to 200; pass one explicitly only when the
   route genuinely returns something else (e.g. 201 for a create).

6. **If `apps/web`/`apps/omiro` needs to consume this resource**, add the client layer in this order:

   a. **Rebuild the API first, always:**

      ```bash
      pnpm --filter @hominem/api build
      ```

      `packages/rpc`'s `HonoClient`/`AppType` resolve against the committed
      `services/api/build/rpc/app.d.ts`, not live source. Skip this step and you get a
      "property doesn't exist on client" error in frontend code that hasn't changed — the fix is
      never in the file the error points at.

   b. **Derive types, never hand-write them.** In `packages/rpc/src/types/<domain>.types.ts`:

      ```ts
      import type { InferRequestType, InferResponseType } from 'hono/client';
      import type { HonoClient } from '../core/api-client';

      type _FooEndpoint = HonoClient['api']['foo']['$get'];
      export type FooOutput = InferResponseType<_FooEndpoint, 200>;
      export type FooInput = InferRequestType<_FooEndpoint>['query']; // or ['json'] for a body
      ```

      Copy this pattern from `chat.types.ts` or `tasks.types.ts`. **Never** write
      `export type FooOutput = { ... }` by hand and cast a hook's `response.json()` to it with
      `as Promise<FooOutput>` — see the Code style rule in the repo's `AGENTS.md`. A hand-written
      duplicate silently drifts from the real route shape instead of failing typecheck when the
      route changes, and it's the reason every call site ends up needing a cast.

   c. **Write the hook** in `apps/web/app/hooks/use-<domain>.ts`:

      ```ts
      export function useFoo() {
        const client = useApiClient();
        return useQuery({
          queryKey: ['foo'],
          queryFn: async () => (await client.api.foo.$get()).json(), // already correctly typed
        });
      }
      ```

      One query key per resource. Mutations call `queryClient.invalidateQueries({ queryKey })` in
      `onSuccess`. Mirror `use-chats.ts` or `use-collections.ts`.

7. **Tests.** Write integration tests against the real `app-test` Postgres database:
   - **Service** (`application/<domain>.service.test.ts`) — call the service functions directly
     against the real test DB; `beforeAll`/`afterAll` do `pool.query('DELETE FROM "user" WHERE id
     = $1', [id])` for one or more fixed test user ids (cascades to all owned `app.*` rows), insert
     the user(s), then exercise the functions and assert both the returned shape and, for
     destructive operations, that dependent rows are actually gone (query the table directly,
     don't just trust a `{ removed: true }` return value).
   - **MCP** (`mcp/tools/<domain>.test.ts`) — mirror `mcp/tools/people.test.ts` / `calendar.test.ts`:
     same `beforeAll`/`afterAll` setup, then `await import('./<domain>')`,
     `await callTool(userId, '<tool>', input)` from `'../tools'`, and assert
     `res.structuredContent`. Assert exact timestamp strings in the DB's raw format.
   - **RPC** (`rpc/routes/<domain>.test.ts`) — mirror `rpc/routes/personal.test.ts`: build a Hono
     app with `requestIdMiddleware`, `apiErrorHandler`, `validationErrorMiddleware`, mount the
     route, and exercise it with `app.request(...)`, mocking `@hominem/db` (or the service) with
     `vi.hoisted`.
   - **Schema** — add `schemas/<domain>.schema.test.ts` when validation logic is non-trivial.
   - **Web e2e** (`apps/web/tests/e2e/<domain>.spec.ts`) — required when the resource has a web UI
     and the flow spans two users (invites, sharing, collaboration). One `storageState` project is
     not enough for that:
     1. Mint a second test account:
        `E2E_TEST_EMAIL=<email> E2E_EXPORT_PREFIX=E2E_COLLABORATOR pnpm --filter @hominem/api e2e:setup`
     2. Drive it with a manually-created context, not the default `page` fixture:
        `const ctx = await browser.newContext({ storageState: collaboratorAuthPath });`
     3. Assert destructive/permission-boundary actions via `page.request.*` directly, not by
        clicking a `window.confirm()` button — clicking one reliably hangs this environment's
        browser automation (a following `page.goto`/`page.reload` recovers the session, but the
        click itself still reports a timeout).
8. **Validate** (from `services/api`):

   ```bash
   pnpm exec vitest run <path/to/test>          # targeted tests first
   pnpm exec vitest run src/mcp                 # full MCP surface
   pnpm typecheck
   pnpm lint
   pnpm exec oxfmt <changed files> --write      # oxfmt: single quotes, sorted imports
   ```

   Then run `pnpm run check` before opening a PR.

## Invariants to enforce in review

- The service layer is the single implementation; tool/route files contain only `registerTool` /
  Hono wiring. Duplicated query logic across `mcp/` and `rpc/` is a defect.
- MCP and RPC import the same schema objects and the same service functions — no per-surface
  schema redefinitions.
- Every MCP operation must also exist as an RPC route. RPC-only write operations are allowed
  (deleting a resource, revoking access) but only as an explicit choice confirmed with the user —
  never a default, and never a reason to duplicate service logic.
- Every query is scoped by `ownerUserid` (multi-tenant correctness; `app.*` is RLS-forced).
- Read-only operations use `readOnly: true`; write operations must declare write scopes
  (e.g. `tags:write`) and gate their file import on them in `mcp/routes.ts`.
- `resultCap` >= the largest array the tool can return, and list queries carry a `limit`.
- New MCP scopes are added to `MCP_SCOPES` (advertised in OAuth discovery), gated in
  `mcp/routes.ts`, and reflected in the `WWW-Authenticate` scope string asserted by
  `mcp/server.test.ts`.
- Keep responses to the shared output schema; let `callTool`/`outputSchema.parse(result)` do the
  validation rather than hand-assembling payloads.
- If a web/mobile hook exists for this resource, its RPC output/input types come from
  `InferResponseType`/`InferRequestType` against `HonoClient`, never a hand-written duplicate of
  the zod schema — see step 6.

## Cross-cutting references

- Goose migrations + type regen: `just db migrate` + `just db codegen` (see
  [packages/db/AGENTS.md](../../../packages/db/AGENTS.md)).
- Full pre-push validation: `pnpm run check`.
- Warehouse (legacy SQLite data source): cross-check the warehouse schema
  directly when a new resource maps to tables that still exist in
  `~/Developer/warehouse`.
