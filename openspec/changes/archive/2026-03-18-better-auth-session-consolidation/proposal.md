## Why

The current sign-in system layers custom Hominem access and refresh tokens on top of Better Auth sessions, which creates duplicate cookies, duplicate refresh paths, and platform-specific session behavior that is difficult to reason about and easy to break. We need to consolidate on a single session model now so web and mobile auth become predictable, testable, and easier to maintain.

## What Changes

- Consolidate normal user session management on Better Auth for web and mobile applications.
- Remove the requirement for app sign-in flows to mint and persist `hominem_access_token` and `hominem_refresh_token` cookies for standard user sessions.
- Update web auth flows so OTP and passkey sign-in complete with Better Auth-managed session persistence and session refresh semantics.
- Update mobile auth flows so bootstrap, authenticated state recovery, and sign-out use Better Auth session state instead of exchanging sessions into a second token system.
- Narrow any remaining custom bearer-token behavior to explicit non-browser or machine-client use cases instead of ordinary app sessions.
- Harden the post-consolidation experience in Notes web, desktop, CLI, and mobile so runtime behavior and UX match the Better Auth session-first model in practice.
- Remove residual first-party dependence on bearer-shaped app session payloads from `/api/auth/session` and preserve user intent, logout truthfulness, and session recovery behavior across apps.

## Capabilities

### New Capabilities
- `better-auth-session-runtime`: Defines Better Auth as the single runtime session mechanism for first-party web and mobile apps, including session persistence, recovery, and logout behavior.

### Modified Capabilities
- `auth-email-otp-passkey-contract`: Change sign-in requirements so email OTP and passkey flows establish and preserve Better Auth-managed sessions for first-party apps without requiring a second app-token session layer.
- `mobile-auth-state-machine`: Change mobile auth bootstrap and recovery requirements so authenticated state derives from Better Auth session state instead of custom access/refresh token storage.

### Expanded Follow-up Scope
- `better-auth-session-runtime`: Tighten the runtime contract so first-party cookie-backed sessions do not rely on `/api/auth/session` minting a parallel bearer session payload.
- `auth-email-otp-passkey-contract`: Preserve post-auth continuation and fallback UX across Notes web and desktop OTP/passkey flows.
- `mobile-auth-state-machine`: Add deterministic behavior for boot failure, session expiry, and passkey recovery when Better Auth session state is temporarily unavailable.

## Impact

- Affected code includes `services/api/src/routes/auth.ts`, `services/api/src/middleware/auth.ts`, `packages/auth/**`, `packages/ui/src/components/auth/**`, `apps/mobile/utils/auth-provider.tsx`, and `apps/mobile/utils/use-mobile-passkey-auth.ts`.
- Web SSR session helpers, mobile auth bootstrap logic, and logout flows will all change.
- Existing custom refresh routes and cookie contracts may be reduced or scoped to non-app clients.
- Auth tests across Notes, Finance, Rocco, API, and mobile will need to move to Better Auth session assertions.
- Follow-up hardening also affects `apps/notes/**`, `apps/desktop/**`, and `tools/cli/**` where residual UX and runtime auth assumptions still diverge from the intended contract.
