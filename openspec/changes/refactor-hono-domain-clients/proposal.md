## Why

The current client-side Hono integration pushes the full API route tree type into dozens of app hooks, which has already caused `TS2589` failures in CI and increases editor type-server cost. We need a narrower client abstraction so apps can keep strong endpoint contracts without paying for the entire API graph in every callback.

## What Changes

- Introduce a lightweight domain client facade in `@hominem/hono-client` that hides the raw Hono client behind focused domain interfaces.
- Pilot the new facade with a `PlacesClient` for Rocco place flows, centralizing route-path details and response parsing inside the shared client layer.
- Update the React Hono provider and hooks to expose the domain facade instead of the full raw Hono client type to app code.
- Migrate the Rocco places hooks to the new domain client surface and verify that project-graph typecheck remains stable.
- Establish a rollout path for future domains such as lists, notes, invites, and finance after the pilot proves the performance and ergonomics gains.

## Capabilities

### New Capabilities
- `domain-api-clients`: Provide domain-scoped API client interfaces that preserve typed app-facing contracts while preventing applications from depending on the full raw Hono client tree.

### Modified Capabilities
- None.

## Impact

- Affected code: `packages/hono-client`, `packages/hono-rpc`, and `apps/rocco` hooks that currently consume `HonoClient`.
- Affected systems: React Query integration, app provider/context wiring, and local/CI TypeScript project-graph checks.
- Risk areas: migration compatibility for existing hooks, domain client interface design, and maintaining typed request/response contracts during rollout.
