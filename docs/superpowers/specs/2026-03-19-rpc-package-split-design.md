# RPC Package Split Design

## Summary

Retire `@hominem/hono-client` and replace the current mixed `@hominem/hono-rpc` package with a clean client-facing contract package named `@hominem/rpc`.

`@hominem/rpc` will own only RPC contract and client-safe utilities. All executable server code will live in `services/api`.

This design optimizes for:
- faster TypeScript and tsserver performance in app workspaces
- strict package boundaries
- one obvious import surface for clients
- no cross-package re-exports
- named exports and focused subpath exports instead of broad barrels

## Goals

- Remove `@hominem/hono-client`
- Rename the remaining shared RPC package to `@hominem/rpc`
- Eliminate all package re-exports, especially `export * from '@hominem/db'`
- Keep client imports simple and stable
- Prevent client code from traversing server runtime dependencies
- Reduce broad type composition and package graph expansion

## Non-Goals

- Preserve the current package structure for backward compatibility
- Keep executable server route handlers in the shared RPC package
- Introduce a second internal server package unless later needed

## Design

### Package Boundaries

#### `@hominem/rpc`

This package owns only client-safe RPC contract code:

- typed client factory
- React query integration helpers
- SSR helpers
- RPC input and output types
- shared RPC schemas when they are truly part of the public contract
- contract-only route declarations if they remain pure and dependency-light

This package must not import:

- `@hominem/db`
- server runtime auth wiring
- environment loaders
- service implementation packages
- executable route handlers
- `services/api`

#### `services/api`

This directory owns all executable server runtime code:

- Hono app assembly
- middleware composition
- route handlers
- DB access
- auth wiring
- server-only utilities
- runtime service wiring

`services/api` may import from `@hominem/rpc` when it needs contract types or client-safe schemas.

### Public Import Surface

Clients should import from these entrypoints only:

- `@hominem/rpc`
- `@hominem/rpc/react`
- `@hominem/rpc/ssr`
- `@hominem/rpc/types/*`
- `@hominem/rpc/schemas/*` only when a schema is genuinely client-facing

Preferred examples:

```ts
import { createClient } from '@hominem/rpc'
import { HonoProvider, useHonoQuery } from '@hominem/rpc/react'
import { createServerClient } from '@hominem/rpc/ssr'
import type { Note } from '@hominem/rpc/types/notes'
```

The root entrypoint should expose only package-owned named exports. It should not become a broad barrel for every type and domain module.

### Naming

Rename client-facing exports to align with the new package identity:

- `createHonoClient` -> `createClient`
- `createApiClient` -> remove or provide as a short-lived migration alias
- `HonoClient` -> `RpcClient`
- `HonoClientType` -> `RpcTransportClient`
- `createServerHonoClient` -> `createServerClient`

### Route Contract Guidance

Route files may live in `@hominem/rpc` only if they are pure contract declarations.

If a route module imports DB code, auth internals, env setup, service implementations, or other runtime dependencies, it belongs in `services/api`.

If needed, split current route modules into:

- contract modules in `@hominem/rpc`
- handler modules in `services/api`

### Re-Export Policy

No package may re-export symbols from another package.

Examples of disallowed patterns:

- `export * from '@hominem/db'`
- root barrels that flatten unrelated domains into one wide surface
- package-level passthrough modules that obscure true ownership

Each package should export only symbols it owns directly.

## Proposed File Layout

### `packages/rpc`

```text
packages/rpc/
  package.json
  tsconfig.json
  src/
    index.ts
    client/
      index.ts
      transport.ts
      error.ts
      transformer.ts
      domains/
        admin.ts
        chats.ts
        finance.ts
        files.ts
        invites.ts
        items.ts
        lists.ts
        messages.ts
        mobile.ts
        notes.ts
        places.ts
        review.ts
        twitter.ts
        user.ts
    react/
      index.ts
      context.tsx
      hooks.ts
      provider.tsx
    ssr/
      index.ts
      server-client.ts
    schemas/
    types/
    contracts/
```

### `services/api`

```text
services/api/
  src/
    app.ts
    server.ts
    middleware/
    routes/
    lib/
    services/
```

## Current Code Mapping

### Move from `packages/hono-client`

Move all current client helpers from `packages/hono-client/src` into `packages/rpc/src`:

- `core/api-client.ts`
- `core/raw-client.ts`
- `core/http-error.ts`
- `core/transformer.ts`
- `domains/**`
- `react/**`
- `ssr/**`

### Move from `packages/hono-rpc`

Move server runtime files out of `packages/hono-rpc/src` into `services/api/src`:

- `app.ts`
- `app.type.ts` if derived from full server assembly
- `middleware/**`
- runtime `routes/**`
- runtime `lib/**`
- runtime `services/**`
- runtime `utils/**`

Keep in `packages/rpc` only the client-safe pieces after review:

- `client.ts` adapted into the new client entrypoint
- `types/**`
- `schemas/**`
- contract-safe helpers only

Delete the root `@hominem/db` re-export from the current package during migration.

## TypeScript Performance Rationale

This split improves TypeScript performance by:

- removing server-only dependencies from the client-visible package graph
- keeping app imports focused on a small shared package
- reducing accidental traversal into DB and runtime server modules
- preferring explicit subpath exports over broad root barrels
- narrowing type ownership so tsserver resolves fewer unrelated declarations

The main performance rule is simple: importing from `@hominem/rpc` in apps must never force TypeScript to inspect executable server code.

## Migration Plan

1. Create `packages/rpc`
2. Move current `hono-client` sources into `packages/rpc`
3. Move server runtime code from `packages/hono-rpc` into `services/api`
4. Reduce remaining shared code to client-safe contract-only modules
5. Rename package references from `@hominem/hono-rpc` to `@hominem/rpc`
6. Update all app and package imports
7. Delete `packages/hono-client`
8. Delete any remaining cross-package re-exports

## Risks

- Some current `types/**` and `schemas/**` files may indirectly depend on server-only modules and will need cleanup before they can remain in `@hominem/rpc`
- `AppType` generation may currently depend on server assembly and may need a new contract-safe source
- Consumers may rely on broad root imports that should be replaced with explicit subpath imports

## Validation

The migration is complete when:

- `@hominem/hono-client` no longer exists
- `@hominem/rpc` contains only client-safe code
- `services/api` is the only runtime server home
- no package re-exports symbols from another package
- app workspaces import only from `@hominem/rpc` surfaces
- typecheck, tests, and repo safety checks pass
