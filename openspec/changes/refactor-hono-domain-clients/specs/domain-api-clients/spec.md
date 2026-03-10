## ADDED Requirements

### Requirement: Applications SHALL consume domain-scoped API clients
The client integration layer SHALL expose domain-scoped API client interfaces to applications so that app code can call typed domain methods without depending on the full raw Hono client route tree.

#### Scenario: Query hook uses a domain client
- **WHEN** an application query hook invokes the shared Hono React query helper
- **THEN** the hook receives an app-facing API client facade with domain methods
- **AND** the hook does not need to import or annotate the raw `HonoClient` type

### Requirement: Domain clients SHALL centralize transport details
Each domain client SHALL encapsulate route paths, HTTP method wiring, and response parsing for the endpoints it represents so that application hooks are insulated from raw Hono route structure.

#### Scenario: Places domain wraps raw route calls
- **WHEN** the places domain client performs a place operation
- **THEN** it issues the underlying Hono request internally
- **AND** it returns the typed domain output expected by application hooks
- **AND** application hooks do not call `client.api...` directly for migrated place flows

### Requirement: Pilot migration SHALL preserve places behavior
The initial Rocco places migration SHALL preserve the existing functional behavior of place queries and mutations while moving their transport calls behind the `PlacesClient` interface.

#### Scenario: Existing place mutation behavior remains intact
- **WHEN** a migrated place mutation succeeds or fails
- **THEN** the surrounding hook continues to run its existing cache invalidation and optimistic update logic
- **AND** the request and response payload contracts remain compatible with current place flows

### Requirement: The pilot SHALL improve typecheck stability
The domain client pilot SHALL remove the known deep raw-client type hotspots from the migrated provider and hooks so that clean TypeScript project-graph checks can complete without the previously observed excessive-instantiation failure mode.

#### Scenario: Clean project-graph typecheck succeeds after migration
- **WHEN** the repository runs the existing type generation and typecheck workflow from a clean graph state
- **THEN** the migrated provider and Rocco places hooks do not fail with raw-client-related `TS2589` instantiation errors
