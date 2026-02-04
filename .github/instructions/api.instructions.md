---
applyTo: 'packages/hono-rpc/**, services/api/**'
---

# API Engineering

## Rules

- Define named request/response types and export them from `packages/hono-rpc/src/types` or the relevant service package.
- Do not infer route types from app instances.
- Service layer is framework-agnostic and throws typed errors.
- Route layer validates input, calls services, maps errors to HTTP status codes, and returns ApiResult envelopes.
- Success response shape: `{ success: true, data }`.
- Error response shape: `{ success: false, code, message, details? }`.
- Map errors to status codes: 400, 401, 403, 404, 409, 500, 503.
- Validate all inputs with Zod schemas.
- Reuse schemas between service and route layers.
- Service functions accept a single object parameter.
- Do not expose internal error details to clients.

## Anti-rules

- No duplicated domain types; import from `@hominem/db/schema`.
- No HTTP/framework logic in services.
- No plain `Error` for user-visible failures.
