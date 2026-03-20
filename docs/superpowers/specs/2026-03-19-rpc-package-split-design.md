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

Recommended adjustments:
- make the typed client depend on a contract-only type source instead of `services/api` app assembly
- add an explicit contract-model extraction phase before moving `types/**` and `schemas/**`
- migrate in phases with temporary compatibility aliases so apps and shared UI packages do not have to flip all imports at once

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

### Typed Client Source

The typed client must not derive its type surface from `services/api` runtime assembly.

Recommended approach:

- define the RPC surface in pure contract modules inside `@hominem/rpc/contracts`
- derive the client transport type from those contract modules
- have `services/api` implement and mount handlers against that contract surface

Do not make `@hominem/rpc` import `services/api` just to compute `AppType`.

If contract modules are not sufficient for Hono client typing, add a small generated contract artifact in `packages/rpc/build` that is produced from contract-only inputs. Do not generate types from full server assembly.

### Contract Model Ownership

`@hominem/rpc/types/*` should own client-facing contract models directly.

Recommended approach:

- move public input and output models into `@hominem/rpc/types/*`
- keep public validation schemas in `@hominem/rpc/schemas/*`
- let server packages map between DB or service-layer models and RPC contract models at the boundary

Do not re-export domain model types from service packages such as `@hominem/notes-services` or any package that depends on `@hominem/db`.

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

Temporary migration aliases are allowed only during the migration window when they are package-owned wrappers, time-boxed, and documented for removal.

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
    compat/
```

### `services/api`

```text
services/api/
  src/
    app.ts
    server.ts
    rpc/
      app.ts
      routes/
      handlers/
    middleware/
    routes/
    lib/
    services/
```

### Server Assembly Recommendation

`services/api` already owns server startup and non-RPC routes, so the migration should consolidate RPC assembly under that existing runtime instead of creating a second top-level server home.

Recommended approach:

- keep `services/api/src/server.ts` as the outer server entrypoint
- create `services/api/src/rpc/app.ts` for the RPC-only Hono app
- move migrated RPC handlers under `services/api/src/rpc/routes/**` or `services/api/src/rpc/handlers/**`
- keep shared API concerns such as auth, error handling, and CORS in `services/api`

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

Rename on move:

- `createHonoClient` -> `createClient`
- `createApiClient` -> keep as a short-lived alias that forwards to `createClient`
- `createServerHonoClient` -> `createServerClient`
- `HonoClient` -> `RpcClient`
- `HonoClientType` -> `RpcTransportClient`

### Move from `packages/hono-rpc`

Move server runtime files out of `packages/hono-rpc/src` into `services/api/src`:

- `app.ts`
- `middleware/**`
- runtime `routes/**`
- runtime `lib/**`
- runtime `services/**`
- runtime `utils/**`

Keep in `packages/rpc` only the client-safe pieces after review:

- client entrypoints adapted to read from contract-only types
- `types/**` after contract-model extraction
- `schemas/**` after contract-model extraction
- `contracts/**`
- contract-safe helpers only

Delete the root `@hominem/db` re-export from the current package during migration.

Do not carry forward `app.type.ts` if it still depends on runtime `app` assembly.

### Extract Before Move

Before moving shared `types/**` and `schemas/**` into `@hominem/rpc`, review each module and classify it as one of:

- contract-safe and ready to move
- needs model extraction from a service package
- server-only and should stay in `services/api`

Recommended sequence for extracted modules:

1. copy the public shape into `@hominem/rpc/types/*` or `@hominem/rpc/schemas/*`
2. update clients to import the new contract-owned symbol
3. update server handlers to map service-layer data into the RPC contract shape
4. remove the old re-export or passthrough

## TypeScript Performance Rationale

This split improves TypeScript performance by:

- removing server-only dependencies from the client-visible package graph
- keeping app imports focused on a small shared package
- reducing accidental traversal into DB and runtime server modules
- preferring explicit subpath exports over broad root barrels
- narrowing type ownership so tsserver resolves fewer unrelated declarations

The main performance rule is simple: importing from `@hominem/rpc` in apps must never force TypeScript to inspect executable server code.

## Recommended Migration Plan

1. Create `packages/rpc` with root, `react`, `ssr`, `types`, `schemas`, `contracts`, and `compat` entrypoints.
2. Move `packages/hono-client` sources into `packages/rpc`, rename primary exports to the new `rpc` names, and keep short-lived compatibility aliases.
3. Define a contract-only type source for the typed client in `packages/rpc/contracts`. Do not derive the client from `services/api` runtime assembly.
4. Audit every `packages/hono-rpc/src/types/**` and `schemas/**` module and classify each file as contract-safe, needs extraction, or server-only.
5. Extract public contract models into `packages/rpc/types/**` and `packages/rpc/schemas/**`, replacing service-package re-exports with package-owned definitions.
6. Move RPC runtime assembly, middleware, handlers, and server-only helpers from `packages/hono-rpc/src` into `services/api/src/rpc/**`.
7. Update `services/api/src/server.ts` to mount the new local RPC app and stop importing runtime `app` assembly from the shared package.
8. Remove the root `@hominem/db` re-export and any other cross-package passthroughs from the old package surface.
9. Add temporary compatibility wrappers:
   - `@hominem/hono-client` forwards to `@hominem/rpc`
   - `@hominem/hono-rpc/types/*` forwards to `@hominem/rpc/types/*` only where the symbol is already contract-owned
10. Migrate apps and shared React packages to `@hominem/rpc`, `@hominem/rpc/react`, `@hominem/rpc/ssr`, and `@hominem/rpc/types/*`.
11. Delete `packages/hono-client` after all consumers have moved.
12. Delete the remaining legacy `@hominem/hono-rpc` compatibility surface after repo-wide import cleanup lands.

### Compatibility Window

Use a short compatibility window to reduce migration risk:

- preserve the old import paths for one migration cycle
- mark compatibility exports as deprecated in package docs
- do not add new consumers to legacy paths
- remove the aliases once all apps and shared packages are off the old imports

## Risks

- Some current `types/**` and `schemas/**` files may indirectly depend on server-only modules and will need cleanup before they can remain in `@hominem/rpc`
- `AppType` generation may currently depend on server assembly and may need a new contract-safe source
- Consumers may rely on broad root imports that should be replaced with explicit subpath imports
- some shared React packages may depend on both old client helpers and old `types/*` paths, so the migration may need to land in multiple PRs to stay reviewable

## Decision Rules

Use these rules during implementation:

- if a file imports `@hominem/db`, auth runtime wiring, env loaders, or a service package with DB access, it is not client-safe
- if a type is needed by apps, shared React hooks, or SSR helpers, it must live in `@hominem/rpc` and be owned there
- if a server handler needs a richer internal model than the public contract, map it at the server boundary instead of exporting the internal model
- if a compatibility export would require re-exporting server-owned symbols, do not add that alias

## Validation

The migration is complete when:

- `@hominem/hono-client` no longer exists
- `@hominem/rpc` contains only client-safe code
- `services/api` is the only runtime server home
- no package re-exports symbols from another package
- app workspaces import only from `@hominem/rpc` surfaces
- the typed client is derived from contract-only inputs rather than runtime server assembly
- `@hominem/rpc/types/*` no longer re-export service-package or DB-coupled types
- typecheck, tests, and repo safety checks pass
