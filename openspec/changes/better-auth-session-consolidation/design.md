## Context

The repository currently operates two overlapping auth session systems. Better Auth owns identity flows such as email OTP and passkey verification, while a custom Hominem token layer mints JWT access tokens plus refresh tokens and stores them in separate cookies. Web and mobile then bridge between these systems in different ways: web SSR helpers read `hominem_*` cookies directly, while mobile uses Better Auth for passkey sign-in and then exchanges that session for app tokens. This split introduces duplicate refresh logic, inconsistent sign-in persistence behavior, and multiple sources of truth for whether a user is authenticated.

The goal of this change is not to replace Better Auth, but to stop wrapping first-party app sessions in a second session system. Better Auth already provides cookie-backed session persistence, session lookup, and native-client integrations that can support web and mobile directly.

## Goals / Non-Goals

**Goals:**
- Make Better Auth the single session authority for first-party web and mobile app sessions.
- Remove duplicate session cookies and duplicate refresh responsibilities from ordinary sign-in flows.
- Simplify web SSR, mobile bootstrap, and logout around one session model.
- Preserve explicit non-browser token issuance only where a real machine-client or device flow requires it.

**Non-Goals:**
- Replacing Better Auth with another auth provider.
- Removing every custom token endpoint if some are still needed for device or external-client scenarios.
- Redesigning OTP or passkey UX beyond what is needed to complete the session-model consolidation.
- Introducing database schema changes unrelated to session ownership.

## Decisions

### Use Better Auth sessions as the only first-party app session contract

Web and mobile app authentication will be modeled as "has a valid Better Auth session" rather than "has a valid Better Auth session plus a valid Hominem token pair." This removes the need to mint `hominem_access_token` and `hominem_refresh_token` during normal OTP and passkey sign-in.

Alternative considered: keep the dual system and patch cookie propagation bugs. Rejected because it preserves the core operational complexity and leaves every auth flow vulnerable to mismatched session states.

### Move API request authentication for first-party apps to Better Auth session resolution

First-party web requests and mobile-authenticated API calls will resolve user identity from Better Auth session state instead of custom JWT verification. The API auth middleware should grow a clear session-based path for app requests, while any remaining bearer-token path is reserved for explicit machine-client endpoints.

Alternative considered: keep JWT middleware as primary and regenerate custom tokens from Better Auth on every app bootstrap. Rejected because it still duplicates refresh behavior and keeps the system dependent on token exchange glue code.

### Keep custom token endpoints only for explicit non-app use cases

Endpoints such as device code or machine-client token exchange may remain if they serve a real non-browser workflow, but they should no longer define the default app session model. Their scope and callers should be documented and isolated.

Alternative considered: remove all custom token issuance immediately. Rejected because device-style or external-client flows may still need a bearer-token contract, and that can be evaluated separately from app-session consolidation.

### Align mobile bootstrap with Better Auth-native storage

Mobile should recover session state from Better Auth-supported storage and APIs instead of storing and refreshing a second access/refresh token pair in SecureStore. Passkey sign-in should complete directly into the shared session model, and state recovery should use Better Auth session introspection.

Alternative considered: preserve current SecureStore token model for mobile only. Rejected because it would keep mobile behavior divergent from web and continue the dual-session architecture.

## Risks / Trade-offs

- [Middleware conversion complexity] -> Introduce a narrow migration layer that supports session-based auth first for first-party app routes, then prune unused JWT paths after coverage is in place.
- [Mobile integration gaps] -> Verify Better Auth Expo capabilities against current passkey and bootstrap requirements before removing token exchange code.
- [Hidden dependencies on custom bearer tokens] -> Audit API clients and tests to identify true bearer-token consumers before deleting or narrowing endpoints.
- [Cross-app regression risk] -> Add contract tests for OTP sign-in, passkey sign-in, refresh-on-reload, and logout across Notes, Finance, Rocco, and mobile before cutting over fully.

## Migration Plan

1. Document and isolate all first-party app auth entry points and all remaining bearer-token consumers.
2. Update web OTP and passkey completion flows to rely on Better Auth session cookies only.
3. Update `@hominem/auth` SSR and client helpers to read authenticated state from Better Auth sessions.
4. Update mobile auth bootstrap, passkey sign-in, and logout to use Better Auth-managed session persistence.
5. Move first-party API request auth to Better Auth session resolution; keep or fence custom token flows for non-app consumers.
6. Remove obsolete `hominem_*` cookie handling from normal app sign-in and refresh paths after tests pass.
7. Roll back by re-enabling dual-write/dual-read bridges temporarily if a critical first-party route still depends on the custom token layer.

## Open Questions

- Which current API callers truly require bearer tokens instead of cookie- or session-based auth?
- Does the current Better Auth Expo integration cover all mobile recovery and background refresh expectations, or is a small adapter still needed?
- Should device-code flows remain in this repository after first-party app session consolidation, or move to a separate machine-client auth concern later?

## Follow-up Hardening Scope

The first consolidation pass removed the most fragile dual-cookie and refresh behavior, but the audit across Notes web, desktop, CLI, and mobile found that several surfaces still behave like Better Auth is an upstream identity provider feeding a second app-session contract. The next implementation pass should close those gaps without changing the core decision to keep explicit token issuance only for true machine clients.

### Make `/api/auth/session` truly identity-first for first-party sessions

The current `/api/auth/session` response still mints `accessToken` and `expiresIn` for cookie-backed Better Auth sessions. First-party web, desktop, and mobile clients then hydrate local auth state from that bearer-shaped payload and schedule refresh behavior from token expiry rather than from session truth.

The follow-up work should narrow `/api/auth/session` to identity and session-state introspection for first-party callers, then update app clients so they do not require a derived bearer payload to remain signed in.

Alternative considered: keep the bearer-shaped response for convenience and treat it as an internal compatibility layer. Rejected because it preserves the dual-session mental model and keeps logout, boot recovery, and auth guards coupled to token semantics.

### Preserve continuation and fallback intent through auth UX

Notes web currently loses `next` redirect intent across its landing page, OTP entry, and passkey paths. Desktop OTP currently traps users in the verification step when they try to switch email, and mobile exposes generic auth error states without a clear recovery path when session restoration fails.

The follow-up work should make auth continuation explicit and durable across entry, verify, resend, fallback, and logout flows, with API-safe failure behavior for data routes.

Alternative considered: defer UX-only issues until after runtime cleanup. Rejected because broken continuation and misleading auth screens materially change whether the new session model feels reliable to users.

### Make logout and boot recovery truthful

Current clients often clear local state even when server-side sign-out or Better Auth session invalidation fails. Likewise, mobile and some web flows collapse network or timeout errors into a plain signed-out state, which makes outages indistinguishable from real session expiry.

The follow-up work should make logout reflect actual invalidation outcome and should surface a distinct retryable boot/session-recovery state where appropriate.

Alternative considered: keep optimistic local cleanup because it is simpler. Rejected because it can silently leave valid sessions alive and undermines trust in auth state.

### Keep CLI clearly scoped as a machine-client flow

The CLI remains a legitimate bearer-token consumer, but its defaults and messaging still blur the line between browser session auth and device-code token auth. The follow-up work should make the CLI's issuer, login, refresh, and logout behavior obviously machine-client scoped rather than first-party app-session scoped.

Alternative considered: force the CLI into the same Better Auth cookie session model as apps. Rejected because this change explicitly allows token-oriented non-browser clients, and device-code remains the better fit for CLI ergonomics.

## Implementation Audit

- First-party web sign-in and recovery currently depend on `hominem_*` cookies or token exchange in `services/api/src/routes/auth.ts`, `packages/auth/src/client.tsx`, `packages/auth/src/server.ts`, and `packages/ui/src/components/auth/web-auth-route-servers.ts`.
- First-party mobile bootstrap and passkey sign-in currently depend on custom token exchange or stored app tokens in `apps/mobile/utils/auth-provider.tsx` and `apps/mobile/utils/use-mobile-passkey-auth.ts`.
- First-party web app data access currently reads derived access tokens through `apps/notes/app/lib/api/provider.tsx`, `apps/finance/app/lib/api/provider.tsx`, `apps/rocco/app/lib/api/provider.tsx`, and SSR wrappers built on `packages/hono-client/src/ssr/server-client.ts`.
- Non-app or bearer-token-oriented flows that still exist are `POST /api/auth/token`, `POST /api/auth/token-from-session`, `POST /api/auth/device/code`, `POST /api/auth/device/token`, mobile E2E bootstrap at `POST /api/auth/mobile/e2e/login`, and bearer-token WebSocket consumers such as `apps/finance/app/store/websocket-store.ts`.
