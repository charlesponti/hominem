# RPC Package Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@hominem/hono-client` and the mixed `@hominem/hono-rpc` package structure with a clean `@hominem/rpc` package that contains only client-safe contract code, while moving all executable server runtime code into `services/api`.

**Architecture:** Create a new `packages/rpc` package by moving the current client helper code out of `packages/hono-client`, then move server app assembly and runtime-only Hono code out of `packages/hono-rpc` into `services/api`. Keep only client-safe contract surfaces in `packages/rpc`, remove cross-package re-exports, and update all consumers to import from the new package paths.

**Tech Stack:** Bun workspaces, TypeScript, Hono, React Query, Vitest, oxlint, oxfmt

---

## Chunk 1: Establish The New Package Boundary

### Task 1: Scaffold `packages/rpc`

**Files:**
- Create: `packages/rpc/package.json`
- Create: `packages/rpc/tsconfig.json`
- Create: `packages/rpc/src/index.ts`
- Create: `packages/rpc/src/client/index.ts`
- Create: `packages/rpc/src/react/index.ts`
- Create: `packages/rpc/src/ssr/index.ts`
- Modify: `package.json`
- Test: `bun run typecheck --filter @hominem/rpc`

- [ ] **Step 1: Write the failing package scaffold**

Create `packages/rpc/package.json` with the new package name, explicit export map, and only direct package-owned exports:

```json
{
  "name": "@hominem/rpc",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "types": "./build/index.d.ts",
  "exports": {
    ".": {
      "types": "./build/index.d.ts",
      "default": "./src/index.ts"
    },
    "./react": {
      "types": "./build/react/index.d.ts",
      "default": "./src/react/index.ts"
    },
    "./ssr": {
      "types": "./build/ssr/index.d.ts",
      "default": "./src/ssr/index.ts"
    },
    "./types": {
      "types": "./build/types/index.d.ts",
      "default": "./src/types/index.ts"
    },
    "./types/*": {
      "types": "./build/types/*.d.ts",
      "default": "./src/types/*.ts"
    },
    "./schemas/*": {
      "types": "./build/schemas/*.d.ts",
      "default": "./src/schemas/*.ts"
    }
  }
}
```

- [ ] **Step 2: Run typecheck to verify the package is not wired yet**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: FAIL because the package sources and workspace references are incomplete.

- [ ] **Step 3: Add the minimal workspace wiring**

Create `packages/rpc/tsconfig.json` by combining the client build shape from `packages/hono-client/tsconfig.json` with declaration output requirements from `packages/hono-rpc/tsconfig.json`.

Create minimal source files:

```ts
export {}
```

for:

- `packages/rpc/src/index.ts`
- `packages/rpc/src/client/index.ts`
- `packages/rpc/src/react/index.ts`
- `packages/rpc/src/ssr/index.ts`

Update root workspace metadata in `package.json` only if required for build filters or scripts.

- [ ] **Step 4: Run typecheck to verify the package scaffold passes**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json packages/rpc
git commit -m "feat: scaffold rpc package"
```

### Task 2: Add package-boundary guardrails

**Files:**
- Modify: `packages/rpc/package.json`
- Modify: `services/api/package.json`
- Modify: `packages/hono-rpc/package.json`
- Modify: `tsconfig.json`
- Test: `bun run typecheck --filter @hominem/api --filter @hominem/rpc`

- [ ] **Step 1: Write the failing dependency boundary change**

Remove `@hominem/hono-client` from future dependency targets and add `@hominem/rpc` where needed in:

- `services/api/package.json`
- current client consumer package manifests as they are migrated

Mark `packages/hono-rpc/package.json` as transitional so it can be reduced safely during migration instead of serving as the final boundary.

- [ ] **Step 2: Run typecheck to verify imports still point at old packages**

Run: `bun run typecheck --filter @hominem/api --filter @hominem/rpc`

Expected: FAIL with unresolved package imports or missing exports.

- [ ] **Step 3: Add the minimal manifest and tsconfig changes**

Wire `@hominem/rpc` into the dependency graph without adding any re-export compatibility package.

Do not add `@hominem/hono-client` passthrough exports.

- [ ] **Step 4: Run typecheck to verify the new package is visible**

Run: `bun run typecheck --filter @hominem/api --filter @hominem/rpc`

Expected: PASS or only fail on expected missing implementation exports.

- [ ] **Step 5: Commit**

```bash
git add packages/rpc/package.json services/api/package.json packages/hono-rpc/package.json tsconfig.json
git commit -m "chore: wire rpc package boundaries"
```

## Chunk 2: Move Client-Safe Code Into `@hominem/rpc`

### Task 3: Move core client helpers

**Files:**
- Create: `packages/rpc/src/client/transport.ts`
- Create: `packages/rpc/src/client/error.ts`
- Create: `packages/rpc/src/client/transformer.ts`
- Create: `packages/rpc/src/client/api-client.ts`
- Modify: `packages/rpc/src/index.ts`
- Modify: `packages/rpc/src/client/index.ts`
- Modify: `packages/hono-client/src/core/api-client.ts`
- Modify: `packages/hono-client/src/core/raw-client.ts`
- Modify: `packages/hono-client/src/core/http-error.ts`
- Modify: `packages/hono-client/src/core/transformer.ts`
- Test: `bun run typecheck --filter @hominem/rpc`

- [ ] **Step 1: Write the failing export test by switching `packages/rpc` root exports**

Update `packages/rpc/src/index.ts` and `packages/rpc/src/client/index.ts` to export the intended API:

```ts
export { createClient } from './client'
export type { RpcClient, RpcTransportClient, ClientConfig } from './client'
```

Leave the underlying implementation missing so typecheck fails.

- [ ] **Step 2: Run typecheck to verify missing implementation errors**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: FAIL with unresolved modules or missing export names.

- [ ] **Step 3: Move the minimal implementation**

Copy and adapt logic from:

- `packages/hono-client/src/core/api-client.ts`
- `packages/hono-client/src/core/raw-client.ts`
- `packages/hono-client/src/core/http-error.ts`
- `packages/hono-client/src/core/transformer.ts`
- `packages/hono-rpc/src/client.ts`

Target names:

- `createClient`
- `createClientFromTransport`
- `RpcClient`
- `RpcTransportClient`
- `RpcHttpError`

Keep the implementation split into small files and do not re-export through unrelated modules.

- [ ] **Step 4: Run typecheck to verify core client helpers pass**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rpc/src packages/hono-client/src/core packages/hono-rpc/src/client.ts
git commit -m "feat: move rpc client core into rpc package"
```

### Task 4: Move domain clients, React helpers, and SSR helpers

**Files:**
- Create: `packages/rpc/src/client/domains/*.ts`
- Create: `packages/rpc/src/react/context.tsx`
- Create: `packages/rpc/src/react/hooks.ts`
- Create: `packages/rpc/src/react/provider.tsx`
- Create: `packages/rpc/src/ssr/server-client.ts`
- Modify: `packages/rpc/src/react/index.ts`
- Modify: `packages/rpc/src/ssr/index.ts`
- Modify: `packages/hono-client/src/domains/*.ts`
- Modify: `packages/hono-client/src/react/*.tsx`
- Modify: `packages/hono-client/src/react/*.ts`
- Modify: `packages/hono-client/src/ssr/*.ts`
- Test: `bun run typecheck --filter @hominem/rpc`

- [ ] **Step 1: Write the failing package surface**

Set `packages/rpc/src/react/index.ts` to export:

```ts
export { HonoProvider, useHonoClient, useApiClient, useHonoQuery, useHonoMutation, useHonoUtils }
```

Set `packages/rpc/src/ssr/index.ts` to export:

```ts
export { createServerClient }
```

Do not move implementations yet.

- [ ] **Step 2: Run typecheck to verify the React and SSR entrypoints fail**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: FAIL with missing React and SSR modules.

- [ ] **Step 3: Move the minimal implementation**

Copy and adapt current files from:

- `packages/hono-client/src/domains/*.ts`
- `packages/hono-client/src/react/context.tsx`
- `packages/hono-client/src/react/hooks.ts`
- `packages/hono-client/src/react/provider.tsx`
- `packages/hono-client/src/ssr/server-client.ts`

Update internal imports to point only at `packages/rpc/src/**`.

- [ ] **Step 4: Run typecheck to verify the package surface passes**

Run: `bun run typecheck --filter @hominem/rpc`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rpc/src packages/hono-client/src/domains packages/hono-client/src/react packages/hono-client/src/ssr
git commit -m "feat: move rpc react and ssr helpers"
```

## Chunk 3: Move Server Runtime Out Of `packages/hono-rpc`

### Task 5: Move Hono app assembly into `services/api`

**Files:**
- Create: `services/api/src/rpc/app.ts`
- Create: `services/api/src/rpc/app.type.ts`
- Modify: `services/api/src/server.ts`
- Modify: `packages/hono-rpc/src/app.ts`
- Modify: `packages/hono-rpc/src/app.type.ts`
- Test: `bun run test --filter @hominem/api`

- [ ] **Step 1: Write the failing server import change**

Update `services/api/src/server.ts` to import the RPC app from:

- `services/api/src/rpc/app.ts`

instead of:

- `@hominem/hono-rpc`

Leave the new file missing so tests fail.

- [ ] **Step 2: Run API tests to verify the missing app import fails**

Run: `bun run test --filter @hominem/api`

Expected: FAIL with import resolution errors.

- [ ] **Step 3: Move the minimal implementation**

Copy the current server app composition from:

- `packages/hono-rpc/src/app.ts`
- `packages/hono-rpc/src/app.type.ts`

into:

- `services/api/src/rpc/app.ts`
- `services/api/src/rpc/app.type.ts`

Update imports so runtime code stays entirely under `services/api`.

- [ ] **Step 4: Run API tests to verify the server boots from the new location**

Run: `bun run test --filter @hominem/api`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/rpc services/api/src/server.ts packages/hono-rpc/src/app.ts packages/hono-rpc/src/app.type.ts
git commit -m "refactor: move rpc app assembly into api service"
```

### Task 6: Move runtime middleware, routes, and server utilities

**Files:**
- Create: `services/api/src/rpc/routes/*.ts`
- Create: `services/api/src/rpc/middleware/*.ts`
- Create: `services/api/src/rpc/lib/*.ts`
- Create: `services/api/src/rpc/services/*.ts`
- Modify: `packages/hono-rpc/src/routes/*.ts`
- Modify: `packages/hono-rpc/src/middleware/*.ts`
- Modify: `packages/hono-rpc/src/lib/*.ts`
- Modify: `packages/hono-rpc/src/services/*.ts`
- Modify: `packages/hono-rpc/src/utils/*.ts`
- Test: `bun run test --filter @hominem/api`
- Test: `bun run typecheck --filter @hominem/api`

- [ ] **Step 1: Write the failing move for one representative runtime module**

Start with one runtime route file such as:

- `packages/hono-rpc/src/routes/items.ts`

Move its import in the new app assembly to:

- `services/api/src/rpc/routes/items.ts`

without creating the destination file yet.

- [ ] **Step 2: Run API typecheck to verify the route move fails**

Run: `bun run typecheck --filter @hominem/api`

Expected: FAIL with missing route module errors.

- [ ] **Step 3: Move runtime modules incrementally**

For each runtime-only area, move files from `packages/hono-rpc/src/**` into `services/api/src/rpc/**` in small batches:

- `middleware/**`
- `routes/**`
- `lib/**`
- `services/**`
- runtime-only `utils/**`

After each batch, update local imports so `services/api` no longer pulls runtime code from `packages/hono-rpc`.

- [ ] **Step 4: Run API verification after each batch**

Run after each batch:

- `bun run typecheck --filter @hominem/api`
- `bun run test --filter @hominem/api`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/src/rpc packages/hono-rpc/src
git commit -m "refactor: move hono runtime modules into api service"
```

## Chunk 4: Reduce `packages/hono-rpc` To The New `@hominem/rpc` Contract

### Task 7: Move client-safe types and schemas into `packages/rpc`

**Files:**
- Create: `packages/rpc/src/types/*.ts`
- Create: `packages/rpc/src/schemas/*.ts`
- Modify: `packages/hono-rpc/src/types/*.ts`
- Modify: `packages/hono-rpc/src/schemas/*.ts`
- Modify: `packages/rpc/package.json`
- Test: `bun run typecheck --filter @hominem/rpc`

- [ ] **Step 1: Write the failing type import move**

Change one client consumer import from:

```ts
import type { Note } from '@hominem/hono-rpc/types'
```

to:

```ts
import type { Note } from '@hominem/rpc/types'
```

without moving the underlying type file yet.

- [ ] **Step 2: Run typecheck to verify the new type path fails**

Run: `bun run typecheck --filter @hominem/rpc --filter @hominem/mobile`

Expected: FAIL with unresolved type modules.

- [ ] **Step 3: Move only client-safe types and schemas**

Copy and adapt files from:

- `packages/hono-rpc/src/types/*.ts`
- `packages/hono-rpc/src/schemas/*.ts`

Only keep modules in `packages/rpc` that do not import server runtime code.

If a type or schema depends on runtime code, split it before moving:

- contract types stay in `packages/rpc`
- server implementation details stay in `services/api`

- [ ] **Step 4: Run typecheck to verify moved types and schemas are clean**

Run: `bun run typecheck --filter @hominem/rpc --filter @hominem/mobile --filter @hominem/web`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/rpc/src/types packages/rpc/src/schemas packages/hono-rpc/src/types packages/hono-rpc/src/schemas
git commit -m "refactor: move rpc contract types into rpc package"
```

### Task 8: Remove cross-package re-exports and rename the package

**Files:**
- Modify: `packages/hono-rpc/src/index.ts`
- Modify: `packages/hono-rpc/package.json`
- Modify: `packages/rpc/package.json`
- Delete: `packages/hono-client`
- Test: `bun run typecheck --filter @hominem/rpc --filter @hominem/api`

- [ ] **Step 1: Write the failing root export cleanup**

Remove:

```ts
export * from '@hominem/db'
```

from `packages/hono-rpc/src/index.ts`.

Update package names so imports are expected to come from `@hominem/rpc`.

- [ ] **Step 2: Run typecheck to verify old root imports fail**

Run: `bun run typecheck --filter @hominem/rpc --filter @hominem/api`

Expected: FAIL wherever consumers still rely on the old package names or root re-exports.

- [ ] **Step 3: Finish the package rename**

Rename `packages/hono-rpc` package metadata to `@hominem/rpc` if the new package path is replacing it in place, or delete the old package once all code lives under `packages/rpc`.

Delete `packages/hono-client` only after all imports are updated and verification passes.

- [ ] **Step 4: Run typecheck to verify the old package surfaces are gone**

Run: `bun run typecheck --filter @hominem/rpc --filter @hominem/api`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/hono-rpc packages/rpc
git rm -r packages/hono-client
git commit -m "refactor: retire hono-client and remove rpc re-exports"
```

## Chunk 5: Migrate Consumers To The New Import Surface

### Task 9: Update all app and package imports

**Files:**
- Modify: `apps/mobile/**/*.ts`
- Modify: `apps/mobile/**/*.tsx`
- Modify: `apps/web/**/*.ts`
- Modify: `apps/web/**/*.tsx`
- Modify: `apps/desktop/package.json`
- Modify: `apps/mobile/package.json`
- Modify: `apps/web/package.json`
- Modify: `packages/finance-react/**/*.ts`
- Modify: `packages/finance-react/**/*.tsx`
- Modify: `packages/invites-react/**/*.ts`
- Modify: `packages/lists-react/**/*.ts`
- Modify: `packages/places-react/**/*.ts`
- Modify: `packages/ui/package.json`
- Test: `bun run typecheck`

- [ ] **Step 1: Write the failing import replacement in one consumer**

Update one real consumer, for example:

- `apps/web/app/lib/api/provider.tsx`
- `apps/mobile/utils/api-provider.tsx`

from `@hominem/hono-client` to `@hominem/rpc`.

- [ ] **Step 2: Run package-specific typecheck to verify the missing exports fail**

Run: `bun run typecheck --filter @hominem/web --filter @hominem/mobile`

Expected: FAIL with missing export or package resolution errors.

- [ ] **Step 3: Replace imports in small batches**

Batch imports by package:

- app provider files
- React hooks packages
- direct type imports
- SSR helpers

Required replacements:

- `@hominem/hono-client` -> `@hominem/rpc`
- `@hominem/hono-client/react` -> `@hominem/rpc/react`
- `@hominem/hono-client/ssr` -> `@hominem/rpc/ssr`
- `@hominem/hono-rpc/types/*` -> `@hominem/rpc/types/*`

- [ ] **Step 4: Run full typecheck to verify consumer migration passes**

Run: `bun run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps packages
git commit -m "refactor: migrate consumers to rpc package"
```

## Chunk 6: Final Verification And Cleanup

### Task 10: Verify no forbidden boundaries remain

**Files:**
- Modify: `packages/db/src/index.ts`
- Modify: `docs/superpowers/specs/2026-03-19-rpc-package-split-design.md`
- Test: `rg -n "export \\* from '@hominem/db'|@hominem/hono-client|@hominem/hono-rpc" apps packages services`
- Test: `bun run check`

- [ ] **Step 1: Write the failing boundary audit**

Run the audit commands before cleanup so they expose any remaining forbidden imports:

```bash
rg -n "export \\* from '@hominem/db'|@hominem/hono-client|@hominem/hono-rpc" apps packages services
```

Expected: at least one match until cleanup is complete.

- [ ] **Step 2: Remove the remaining forbidden references**

Clean up any remaining references in source files, manifests, and docs.

Update `packages/db/src/index.ts` messaging if it still points clients to `@hominem/hono-client`.

- [ ] **Step 3: Run final verification**

Run from the monorepo root:

- `bun run validate-db-imports`
- `bun run test`
- `bun run typecheck`
- `bun run check`

Expected: PASS

- [ ] **Step 4: Confirm the package boundary invariant**

Run:

```bash
rg -n "export \\* from '@hominem/db'|@hominem/hono-client|@hominem/hono-rpc" apps packages services
```

Expected: no source matches except historical docs that are intentionally preserved.

- [ ] **Step 5: Commit**

```bash
git add apps packages services docs
git commit -m "chore: finalize rpc package split"
```
