# ADR 0003: Put coordinated chat workflows in application services

## Status

Accepted (2026-09-01)

## Decision

Generation, replay, confirmation, cancellation, speech, and message-deletion
cleanup are application operations independent of Hono. RPC routes authenticate,
validate transport input, invoke one operation, and adapt the result. Simple
single-resource CRUD may remain a direct repository adapter.

Current generation execution remains request-bound. Detached worker execution
and fresh-launch recovery are separate work and must not be hidden in routes.

## Consequences

Provider, MCP, repository, event-bus, cancellation, usage, storage, and
telemetry coordination has one testable owner. Route files have predictable
seams and cannot silently grow a second generation lifecycle implementation.
Application services expose typed operations rather than callback-shaped route
controls.
