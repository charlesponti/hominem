## 1. Shared Client Facade

- [x] 1.1 Add a private raw Hono client boundary and a public `ApiClient` facade in `packages/hono-client`
- [x] 1.2 Define the initial `PlacesClient` domain interface and implementation that wraps the place endpoints used by Rocco
- [x] 1.3 Update the shared Hono React provider, context, and hooks to expose `ApiClient` rather than raw `HonoClient`
- [x] 1.4 Add `ListsClient` and `InvitesClient` domain interfaces and implementations for the remaining high-value Rocco hooks
- [x] 1.5 Remove the temporary raw `api` compatibility property from `ApiClient` once the remaining Notes, Finance, and Mobile consumers no longer require it

## 2. Rocco Hook Migration

- [x] 2.1 Refactor `apps/rocco/app/lib/hooks/use-places.ts` to use `places.*` domain methods instead of `client.api...`
- [x] 2.2 Preserve existing React Query cache invalidation and optimistic update behavior during the migration
- [x] 2.3 Remove raw `HonoClient` imports and callback annotations from the migrated Rocco places hooks
- [x] 2.4 Refactor `apps/rocco/app/lib/hooks/use-lists.ts` to use `lists.*` domain methods instead of `client.api...`
- [x] 2.5 Refactor `apps/rocco/app/lib/hooks/use-invites.ts` to use `invites.*` domain methods instead of `client.api...`
- [x] 2.6 Remove remaining raw route-tree access from the migrated Rocco hook slice

## 3. Validation

- [x] 3.1 Measure focused package or app-slice typecheck timing before and after the expanded migration
- [x] 3.2 Run `bun turbo run typegen && bun run typecheck` to verify the expanded migration remains stable
- [x] 3.3 Run `bun run check` to confirm the shared client changes integrate cleanly with the repo safety checks
- [x] 3.4 Document rollout follow-ups for Notes, Finance, and Mobile after the Rocco slice is complete
