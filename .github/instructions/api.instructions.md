---
applyTo: 'packages/hono-rpc/**, services/api/**'
---

# API Engineering

## Rules

- Define named request/response types and export them from `packages/hono-rpc/src/types` or the relevant service package.
- Do not infer route types from app instances.
- Service layer is framework-agnostic and throws typed errors.
- Route layer validates input, calls services, maps errors to HTTP status codes, and returns direct JSON responses.
- Success responses should return the concrete contract body for the endpoint. Use wrapper shapes only when the endpoint contract explicitly requires them.
- Error responses should come from typed errors and shared middleware, not ad-hoc route-local envelopes.
- Map errors to status codes: 400, 401, 403, 404, 409, 500, 503.
- Validate all inputs with Zod schemas.
- Reuse schemas between service and route layers.
- Service functions accept a single object parameter.
- Do not expose internal error details to clients.
- When integrating third-party providers, catch provider-specific failures at the service or integration boundary, log the raw provider failure server-side with structured metadata, and translate it into a typed `ServiceError` before it reaches the client.
- For third-party provider failures, prefer these mappings:
  - Temporary upstream outage, rate limit, or timeout -> `UnavailableError`
  - Unexpected provider failure or malformed upstream response -> `InternalError`
  - Missing local auth/session context required for the provider action -> `UnauthorizedError`
  - Missing local resource required for the provider action -> `NotFoundError`
- Successful provider-backed routes should still return the direct JSON success body for the endpoint contract rather than provider-shaped envelopes.

## Anti-rules

- No duplicated domain types; import from `@hominem/db/schema`.
- No HTTP/framework logic in services.
- No plain `Error` for user-visible failures.
- No raw SDK/provider error payloads returned directly to clients.
