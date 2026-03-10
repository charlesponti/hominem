---
name: api-engineering
description: Use for Hono RPC and API work in `packages/hono-rpc` and `services/api`. Covers route contracts, service boundaries, typed errors, validation, and provider failure mapping.
---

# API Engineering

## Use This For

- route handlers in `packages/hono-rpc/**`
- backend work in `services/api/**`
- request and response contract design
- service-layer error handling

## Rules

- Define named request and response types and export them from `packages/hono-rpc/src/types` or the relevant service package.
- Do not infer route types from app instances.
- Keep service code framework-agnostic.
- Let services throw typed errors and let routes map them to HTTP responses.
- Return the concrete contract body on success unless the endpoint explicitly requires a wrapper.
- Use shared middleware and typed errors for failures instead of route-local error envelopes.
- Map errors to `400`, `401`, `403`, `404`, `409`, `500`, or `503`.
- Validate all inputs with Zod.
- Reuse schemas across service and route layers.
- Make service functions accept a single object parameter.
- Do not expose internal error details to clients.

## Provider Boundaries

When integrating external providers:

- catch provider-specific failures at the service or integration boundary
- log the raw provider failure server-side with structured metadata
- translate it into a typed `ServiceError` before it reaches the client

Preferred mappings:

- outage, timeout, or rate limit -> `UnavailableError`
- malformed upstream response or unexpected provider failure -> `InternalError`
- missing local auth/session context -> `UnauthorizedError`
- missing required local resource -> `NotFoundError`

Provider-backed routes should still return the repo’s endpoint contract, not provider-shaped envelopes.

## Anti-Rules

- No duplicated domain types when canonical ones already exist.
- No HTTP or framework logic in services.
- No plain `Error` for user-visible failures.
- No raw provider payloads returned to clients.
