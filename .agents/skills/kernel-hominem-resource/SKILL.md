---
name: kernel-hominem-resource
kind: skill
tags:
  - api
  - schema
  - mcp
  - rpc
  - zod
description: >
  Add a new resource (domain) to the hominem API: shared Zod schemas in
  services/api/src/schemas, one implementation in
  services/api/src/application/*.service.ts, and two thin adapters that reuse
  it — an MCP tool in services/api/src/mcp/tools and Hono RPC routes in
  services/api/src/rpc/routes — plus integration tests. Use when adding a
  feature that must be reachable over MCP and/or HTTP/RPC, or when reviewing
  whether new tool/route code follows the shared-implementation pattern.
license: MIT
compatibility: Hominem API service work.
metadata:
  author: project
  version: "1.0"
  category: API
when:
  - adding a resource that must be reachable over MCP and/or HTTP/RPC
  - reviewing whether new tool/route code follows the shared-implementation pattern
  - adding Zod schemas, an application service, or integration tests in the hominem API
termination:
  - Both MCP and RPC surfaces are thin adapters over the one shared implementation
  - Integration tests pass for the new resource
outputs:
  - Shared schema + service implementation and both adapter surfaces
argumentHint: the resource (domain) to add to the hominem API
---

# Add an API resource to hominem

A resource (e.g. `calendar`, `people`, `career`) is exposed over **two outward surfaces**:

1. **MCP tools** — `services/api/src/mcp/tools/*.ts`, called by AI clients via `callTool`.
2. **RPC routes** — `services/api/src/rpc/routes/*.ts`, plain HTTP JSON under `/api`, called by web/mobile clients.

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
| Tests      | `services/api/src/mcp/tools/<domain>.test.ts`, `services/api/src/rpc/routes/<domain>.test.ts`, optional `services/api/src/schemas/<domain>.schema.test.ts` | Behavior verification                          |

## Workflow

1. **Schema first.** If the resource needs new tables/columns, run the Goose migration workflow
   (load the `db-migrate` skill): write the migration, then `just db migrate` + `just db codegen`
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

5. **RPC adapter** (`rpc/routes/<domain>.ts`): Hono routes calling the same service, with
   `zValidator` for input and `respondWithData` for the `{ data }` envelope:

   ```ts
   import { zValidator } from '@hono/zod-validator';
   import { Hono } from 'hono';

   import { getCalendarEvents } from '../../application/calendar.service';
   import {
     calendarEventsInputSchema,
     calendarEventsOutputSchema,
   } from '../../schemas/calendar.schema';
   import { authMiddleware, type AppContext } from '../middleware/auth';
   import { respondWithData } from '../response';

   const routes = new Hono<AppContext>().use('*', authMiddleware);

   routes.get('/calendar/events', zValidator('query', calendarEventsInputSchema), async (c) => {
     const userId = c.get('auth')!.userId;
     const input = c.req.valid('query');
     const events = await getCalendarEvents({ ownerUserId: userId, ...input });
     return respondWithData(c, calendarEventsOutputSchema, events);
   });

   export const calendarRoutes: Hono<AppContext> = routes;
   ```

   Mount it in `services/api/src/rpc/app.ts`:
   `import { calendarRoutes } from './routes/calendar';` then
   `.route('', calendarRoutes)` (prefixed routes use `.route('/prefix', ...)`).
   Route handlers must be one-liners that delegate to the service — no query logic in the route.

6. **Tests.** Write integration tests against the real `app-test` Postgres database:
   - **MCP** (`mcp/tools/<domain>.test.ts`) — mirror `mcp/tools/people.test.ts` / `calendar.test.ts`:
     in `beforeAll`, `DELETE FROM "user" WHERE id = $1` for a fixed test `userId` (cascades to all
     owned `app.*` rows), insert the user plus seed rows, then `await import('./<domain>')`,
     `await callTool(userId, '<tool>', input)` from `'../tools'`, and assert
     `res.structuredContent`. Assert exact timestamp strings in the DB's raw format.
   - **RPC** (`rpc/routes/<domain>.test.ts`) — mirror `rpc/routes/personal.test.ts`: build a Hono
     app with `requestIdMiddleware`, `apiErrorHandler`, `validationErrorMiddleware`, mount the
     route, and exercise it with `app.request(...)`, mocking `@hominem/db` (or the service) with
     `vi.hoisted`.
   - **Schema** — add `schemas/<domain>.schema.test.ts` when validation logic is non-trivial.
7. **Validate** (from `services/api`):

   ```bash
   pnpm exec vitest run <path/to/test>          # targeted tests first
   pnpm exec vitest run src/mcp                 # full MCP surface
   pnpm typecheck
   pnpm lint
   pnpm exec oxfmt <changed files> --write      # oxfmt: single quotes, sorted imports
   ```

   Then run `just check` (or the `check-all` skill) before opening a PR.

## Invariants to enforce in review

- The service layer is the single implementation; tool/route files contain only `registerTool` /
  Hono wiring. Duplicated query logic across `mcp/` and `rpc/` is a defect.
- MCP and RPC import the same schema objects and the same service functions — no per-surface
  schema redefinitions.
- Every query is scoped by `ownerUserid` (multi-tenant correctness; `app.*` is RLS-forced).
- Read-only operations use `readOnly: true`; write operations must declare write scopes
  (e.g. `tags:write`) and gate their file import on them in `mcp/routes.ts`.
- `resultCap` >= the largest array the tool can return, and list queries carry a `limit`.
- New MCP scopes are added to `MCP_SCOPES` (advertised in OAuth discovery), gated in
  `mcp/routes.ts`, and reflected in the `WWW-Authenticate` scope string asserted by
  `mcp/server.test.ts`.
- Keep responses to the shared output schema; let `callTool`/`respondWithData` do the parsing
  rather than hand-assembling payloads.

## Cross-cutting references

- Goose migrations + type regen: load the `db-migrate` skill.
- Full pre-push validation: load the `check-all` skill.
- Warehouse (legacy SQLite data source): load the `db-schema-diff` skill when a new resource
  maps to tables that still exist in `~/Developer/warehouse`.
