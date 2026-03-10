## Context

`@hominem/hono-client` currently exposes the raw `HonoClient` type, which is derived from `hc<AppType>` and therefore carries the complete API route tree into every consumer. App hooks in Rocco, Notes, and Finance frequently annotate callback parameters with `HonoClient` and then call `client.api...` directly. This pattern fans the full server type graph into many files, contributed to recent `TS2589` failures during clean graph builds, and makes editor responsiveness sensitive to unrelated API changes.

The explored alternative is to keep the raw Hono client internal to the shared client package and expose app-facing domain clients instead. Each domain client would offer plain typed methods such as `places.getById({ id })` or `places.addToLists(input)`, while route strings, Hono response parsing, and raw client wiring remain centralized.

## Goals / Non-Goals

**Goals:**
- Reduce type-server fanout by removing raw `HonoClient` from app-facing hook callbacks.
- Preserve strong request and response typing for migrated app hooks.
- Pilot the pattern with Rocco places flows before broader rollout.
- Keep cache invalidation and optimistic update behavior in app hooks, not in the domain client layer.
- Create a migration shape that allows additional domains to adopt the facade incrementally.

**Non-Goals:**
- Migrate every existing app hook in this change.
- Redesign server routes or Hono RPC contracts.
- Eliminate all response casts across the monorepo in one step.
- Change product behavior for places, lists, notes, invites, or finance.

## Decisions

### Expose an `ApiClient` facade instead of raw `HonoClient`

The shared React context and hooks will expose a lightweight `ApiClient` object rather than the raw Hono client. For the pilot, `ApiClient` only needs a `places` domain. This constrains the public type surface that apps depend on and prevents each app hook from importing the full route-tree client type.

Alternative considered:
- Keep exposing `HonoClient` and rely on fewer explicit annotations. This lowers some local inference pressure but leaves the full client graph as part of every hook callback contract and does not create a stable long-term abstraction boundary.

### Keep the raw Hono client private inside `@hominem/hono-client`

The raw client creation remains centralized in the shared client package. Domain factories will receive the raw client privately and translate route operations into app-facing methods. This keeps route strings, method names, and response parsing in one place.

Alternative considered:
- Export both raw and domain clients to app code. This eases migration but weakens the architectural boundary and risks the codebase drifting back to direct `client.api...` usage.

### Use domain-scoped interfaces with plain methods

Each migrated domain will expose a compact interface, starting with `PlacesClient`. Methods will take app-facing input objects and return domain output types directly. This makes hook code simpler and narrows the type server’s work to the domain interface rather than the full Hono route tree.

Alternative considered:
- Export free-standing endpoint helper functions. This also narrows types, but a domain object groups related operations more clearly and matches the current hook authoring style of passing a single client argument into query and mutation callbacks.

### Keep React Query cache logic in the apps

Optimistic updates, cache invalidation, and query key usage stay in app hooks such as `use-places.ts`. Domain clients remain transport-focused and side-effect-free apart from the underlying HTTP request. This limits the scope of the shared abstraction and avoids coupling `@hominem/hono-client` to app-specific cache policy.

Alternative considered:
- Move cache behavior into domain clients. This would reduce hook code but would entangle shared infrastructure with app query conventions and make reuse across apps harder.

### Pilot with Rocco places before rolling out broadly

`apps/rocco/app/lib/hooks/use-places.ts` is the highest-value proving ground because it concentrates many queries, mutations, and the same deep callback typing that previously triggered CI failures. Proving the pattern there gives a concrete benchmark for both ergonomics and typecheck stability before expanding to lists, notes, invites, or finance.

Alternative considered:
- Refactor all domains at once. This would maximize consistency but greatly increases risk and makes it harder to isolate whether the new abstraction improves type-server behavior.

## Risks / Trade-offs

- [Migration overlap between raw and domain clients] -> Use a pilot-first rollout and keep the new `ApiClient` surface intentionally small during the first change.
- [Domain interface drift from underlying routes] -> Centralize route mapping and response typing in one domain module per capability so future API changes have a single update point.
- [Insufficient type-server improvement from one pilot] -> Measure the pilot against project-graph typecheck and editor behavior before committing to broader migration.
- [Extra maintenance surface in `@hominem/hono-client`] -> Keep domain clients small, transport-focused, and generated by consistent patterns so new domains are cheap to add.

## Migration Plan

1. Introduce a private raw Hono client boundary and a public `ApiClient` facade in `@hominem/hono-client`.
2. Add a `PlacesClient` domain module that wraps all place endpoints used by Rocco hooks.
3. Update the shared React provider/context/hooks to work with `ApiClient`.
4. Migrate `apps/rocco/app/lib/hooks/use-places.ts` to use `places.*` methods instead of `client.api...`.
5. Run the existing typecheck and check workflows to confirm the pilot eliminates the current deep type hotspots.
6. Use the pilot outcomes to decide whether follow-up changes should migrate lists, notes, invites, and finance.

## Rollout Follow-Ups

- The pilot keeps a temporary compatibility `api` property on `ApiClient` so untouched callers can continue using raw route access while new domains migrate.
- The next high-value domains to migrate are Rocco lists and invites, followed by Notes and Finance hook surfaces that still annotate or depend on raw route-tree client access.
- After additional domains are migrated, the temporary compatibility `api` property should be removed so the raw Hono route tree is no longer part of the app-facing client contract.

## Open Questions

- Should the first implementation keep a temporary compatibility escape hatch for untouched code paths, or should it fully remove raw client access from the React hooks immediately?
- Should future domains be grouped by product area (`places`, `lists`, `notes`) or by transport concerns (`queries`, `mutations`) as the facade expands?
- Do we want a documented performance benchmark for editor/typecheck behavior before and after the pilot, or is CI stability enough for the first rollout?
