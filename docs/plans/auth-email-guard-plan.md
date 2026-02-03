---
title: Auth Package Hardening and Consistency
date: 2026-02-03
status: planned
category: auth
priority: high
estimated_effort: 3d
---

Executive summary
- Harden auth flows with explicit email guards, profile sync on login, aligned client types, constrained profile updates, and secure tool usage.
- Add defense-in-depth across sessions, authorization, rate limiting, audit logging, and operational safety to reach a "diamond" posture.

Problem statement
- Login currently assumes `email` is always present. If Supabase returns a user without email, DB inserts can fail (unique or not-null constraints) and block auth.
- Existing users are returned without synchronizing updated profile fields from Supabase, which can lead to stale `name`, `image`, or `email` values.
- Client auth types don’t match the actual client implementation, which can cause incorrect usage.
- Profile update helpers accept arbitrary keys and could allow unintended updates if exposed via API routes.
- Tool stubs can be unsafe if wired into a runtime without auth checks.
- Supabase client singleton may be misused in environments with multiple configs.
- Supabase-to-Hominem user mapping can introduce unstable timestamps.
- Auth hardening beyond the auth package is not centralized, leaving gaps in authorization, rate limiting, and auditability.

Scope
- Auth package server logic in `packages/auth/src/user-auth.service.ts` and `packages/auth/src/server.ts`.
- Auth client implementation in `packages/auth/src/client.tsx` and types in `packages/auth/src/types.ts`.
- User mapping in `packages/auth/src/user.ts`.
- Tooling in `packages/auth/src/tools.ts`.
- No changes to Supabase configuration; assumes Google-only auth remains in place.
- Cross-cutting auth protections in route handlers and services that rely on `getServerAuth`.

Tasks
- Add a guard in `findOrCreateUser` that fails early when `supabaseUser.email` is missing, with a clear log message.
- On successful login for existing users, sync `email`, `name`, `image`, `isAdmin`, and `updatedAt` from Supabase data.
- Ensure any auth flows that assume email use the same guard behavior.
- Align `AuthContextType` with the actual client implementation or expand `client.tsx` to fully implement the type contract.
- Constrain profile updates to a Zod-validated whitelist in `updateProfileBySupabaseId`.
- Add config mismatch guard or remove singleton caching for Supabase client in `client.tsx`.
- Avoid unstable timestamps when mapping Supabase users to `HominemUser`.
- Gate or implement real logic for tools in `tools.ts`, including auth checks and input validation.
- Define and document auth invariants and threat model in `docs/AUTH.md`.
- Introduce a centralized authorization layer for server routes and services that require auth or admin access.
- Require explicit auth requirements per route with a default-deny posture.
- Add structured audit logging for auth events with stable event codes.
- Add rate limiting for auth endpoints and sensitive operations.
- Enforce secure cookie settings for server-auth responses and verify they are applied consistently.
- Implement session rotation on login and sensitive actions.
- Add account safety flags in DB such as `deactivatedAt`, `lastLoginAt`, and `loginCount`.
- Add a safe email-change policy and verification path for email updates from Supabase.
- Add CSRF protection for state-changing requests that rely on cookies.
- Validate and sanitize any user-provided fields used in auth-adjacent flows.
- Add re-auth or step-up checks for high-risk actions (admin changes, exports, account deletion).
- Ensure `getServerAuth` is the only place that validates Supabase identity for server-side requests.
- Add automated tests for auth flows, including edge cases for metadata and profile sync.
- Add operational controls for auth emergencies (force reauth, disable login).

Commands
```bash
# Optional: run auth-related tests if present
bun run test --filter auth
```

Verification checklist
- [ ] Google login with a normal account succeeds and does not reinsert duplicate rows.
- [ ] A user with updated Google profile info sees the new `name`/`image` reflected after login.
- [ ] Missing-email scenario fails with a clear, actionable log and no DB error stack.
- [ ] Client auth types accurately represent the available client methods.
- [ ] Profile update calls cannot modify unintended columns (e.g., `isAdmin`, `supabaseId`).
- [ ] Tool invocations require auth or are explicitly dev-only.
- [ ] Supabase client handling is deterministic when multiple configs are used.
- [ ] `toHominemUser` does not generate unstable timestamps when source data is missing.
- [ ] Auth invariants and threat model are documented in `docs/AUTH.md`.
- [ ] Every sensitive route declares its auth requirement and passes centralized authorization checks.
- [ ] Auth events are logged with stable codes and include `userId`, `supabaseId`, `ip`, and `userAgent`.
- [ ] Rate limits apply to login, logout, and sensitive mutations.
- [ ] Cookie attributes are set to `HttpOnly`, `Secure`, and appropriate `SameSite` values.
- [ ] Session tokens rotate on login and for sensitive actions.
- [ ] Deactivated users cannot log in and receive an explicit error.
- [ ] Email change policy is enforced with verification and audit logging.
- [ ] CSRF protection is enabled for cookie-based mutations.
- [ ] Admin or high-risk actions require re-auth or step-up verification.
- [ ] Auth tests cover edge cases: missing email, mismatched supabaseId, stale metadata, and race conditions.
- [ ] Emergency auth controls are documented and accessible to operators.
