## Context

The repo currently mixes two auth contracts for machine callers. The CLI starts a Better Auth device-code flow, but the API middleware prioritizes a custom JWT verifier and the CLI stores token fields as if `/api/auth/device/token` returned the custom refresh-token contract. In practice, the CLI can log in and still fail on protected API requests. We need a CLI-only migration path that uses Better Auth bearer sessions without breaking existing custom JWT consumers.

## Goals / Non-Goals

**Goals:**
- Make CLI login, request auth, and status reporting use one Better Auth bearer-session contract.
- Expose stable `/api/auth/device*` endpoints for device verify and approve flows.
- Accept Better Auth bearer tokens on protected API routes before legacy JWT validation.
- Preserve issuer isolation so CLI tokens are not reused across environments.

**Non-Goals:**
- Removing the custom JWT or refresh-token contract for mobile or other non-CLI callers.
- Reworking first-party browser cookie auth flows.
- Introducing a new custom machine-token exchange on top of Better Auth.

## Decisions

- Use Better Auth bearer-session tokens as the CLI credential, not custom JWTs.
  The server already has Better Auth session lookup and bearer support; the mismatch comes from route wrapping and middleware precedence, not from missing platform capability.
- Keep the CLI on stable first-party `/api/auth/device*` endpoints.
  This avoids leaking the temporary `/api/better-auth/api/auth/*` bootstrap path into user-visible flows and lets the API preserve required headers explicitly.
- Preserve both auth contracts in middleware.
  Middleware will attempt Better Auth session resolution with the incoming bearer header first, then fall back to custom JWT verification for existing machine clients.
- Treat CLI login expiration as session invalidation, not refresh rotation.
  For the pure Better Auth path the CLI will store the bearer token plus issuer metadata and re-authenticate when the server rejects it.
- Validate auth status remotely.
  CLI `auth status` and `system doctor` should report both local token storage and remote validity so a stored but unusable bearer does not appear healthy.

## Risks / Trade-offs

- [Dual auth precedence can regress legacy callers] -> Add middleware tests proving Better Auth bearer and legacy JWT both authenticate successfully.
- [Stable device routes may omit Better Auth headers] -> Add contract tests for forwarded `set-auth-token` and approval behavior.
- [CLI status may become slower due to remote validation] -> Keep validation to lightweight `/api/auth/session` calls and preserve local issuer metadata for fast failure on mismatched environments.
- [Better Auth session expiry may differ from previous JWT TTL expectations] -> Update CLI copy and tests to describe bearer-session semantics explicitly.

## Migration Plan

- Add the new OpenSpec-backed CLI auth behavior behind the existing CLI commands without changing command names.
- Ship stable `/api/auth/device*` endpoints and middleware precedence together so login and authenticated requests become compatible in the same release.
- Keep custom `/api/auth/token` and JWT issuance paths untouched for non-CLI callers.
- If rollback is needed, revert CLI storage/lookup changes and device endpoint wrappers together so the old custom-token path remains the only machine auth contract.

## Open Questions

- None for this CLI-only migration.
