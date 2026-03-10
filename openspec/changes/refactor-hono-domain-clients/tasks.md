## 1. Shared Client Facade

- [x] 1.1 Add a private raw Hono client boundary and a public `ApiClient` facade in `packages/hono-client`
- [x] 1.2 Define the initial `PlacesClient` domain interface and implementation that wraps the place endpoints used by Rocco
- [x] 1.3 Update the shared Hono React provider, context, and hooks to expose `ApiClient` rather than raw `HonoClient`

## 2. Rocco Places Pilot

- [x] 2.1 Refactor `apps/rocco/app/lib/hooks/use-places.ts` to use `places.*` domain methods instead of `client.api...`
- [x] 2.2 Preserve existing React Query cache invalidation and optimistic update behavior during the migration
- [x] 2.3 Remove raw `HonoClient` imports and callback annotations from the migrated Rocco places hooks

## 3. Validation

- [x] 3.1 Run `bun turbo run typegen && bun run typecheck` to verify the pilot removes the current deep type hotspots
- [x] 3.2 Run `bun run check` to confirm the shared client changes integrate cleanly with the repo safety checks
- [x] 3.3 Document any rollout follow-ups for additional domains based on the pilot results
