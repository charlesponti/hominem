# Mobile Authentication Architecture

This document explains the current mobile authentication architecture across API and iOS app surfaces, including production, development, and testing behavior.

## System Overview

Mobile auth uses Better Auth with Expo integration and an email+OTP primary sign-in entrypoint.

Core components:

- API auth orchestration in `services/api/src/routes/auth.ts`
- Better Auth server with Expo plugin in `services/api/src/auth/better-auth.ts`
- Mobile auth client in `apps/mobile/lib/auth-client.ts`
- Mobile auth state/provider in `apps/mobile/utils/auth-provider.tsx`

Primary mobile auth API endpoints:

- `POST /api/auth/email-otp/send`
- Better Auth email OTP verification endpoint (`authClient.signIn.emailOtp`)

Supporting non-production test endpoint:

- `POST /api/auth/mobile/e2e/login`

## Production

### Auth flow (email + OTP)

1. User enters email in mobile auth screen.
2. App calls `POST /api/auth/email-otp/send` with `{ email, type: 'sign-in' }`.
3. User enters OTP.
4. App verifies with Better Auth client (`authClient.signIn.emailOtp`).
5. Better Auth session becomes available to `authClient.useSession()`.
6. Route guard transitions app from `/(auth)` to `/(drawer)/(tabs)/start`.

### Production security controls

- OTP send/verify validation and rate limits.
- Session establishment through Better Auth.
- E2E bypass endpoint disabled in production (`NODE_ENV=production` blocks it).

### Production runtime dependencies

- Better Auth secrets/config (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- API availability for OTP send/verify.
- Better Auth session persistence.

## Development

### Local development behavior

- Mobile client uses `@better-auth/expo/client` plugin with secure storage.
- API base URL comes from Expo config `extra.apiBaseUrl` (`EXPO_PUBLIC_API_BASE_URL`).
- Runtime identity now comes from `APP_VARIANT`, not `NODE_ENV`.
- Local scripts load env files through `apps/mobile/scripts/run-variant.sh`.
- Variant matrix is explicit:
  - `dev`: `expo-dev-client` enabled for developer workflows
  - `e2e`: dedicated non-dev-client Detox runtime with OTA disabled
  - `preview`: internal QA distribution
  - `production`: release runtime
- Deep link schemes are variant-specific:
  - `hakumi-dev://auth/callback`
  - `hakumi-e2e://auth/callback`
  - `hakumi-preview://auth/callback`
  - `hakumi://auth/callback`

### Mobile app auth state model

- `AuthProvider` exposes explicit auth status:
  - `booting`
  - `signed_out`
  - `signed_in`
  - `degraded`
- Provider is state/actions only (no route navigation side effects).
- Root layout route guard performs navigation based on provider state.
- On authenticated session:
  - syncs/merges profile into local store
  - exposes `isSignedIn`, `currentUser`, and auth actions
- Sign-out clears Better Auth session and local store state.

### Development constraints and caveats

- Mobile flow depends on API + Redis availability for authorize/callback/exchange continuity.
- `getAccessToken()` now returns a session token only when available in Better Auth session payload; it no longer returns `session.user.id` pseudo-token.

## Testing

### Mobile E2E testing model

Mobile E2E does not run full Apple OAuth in deterministic CI/device automation by default.
Instead, it uses non-production token bootstrap:

- Endpoint: `POST /api/auth/mobile/e2e/login`
- Required header: `x-e2e-auth-secret: <AUTH_E2E_SECRET>`
- Enabled only when:
  - `AUTH_E2E_ENABLED=true`
  - `NODE_ENV !== 'production'`

Deterministic Detox auth flow added for this change:

- `apps/mobile/e2e/auth.mobile.e2e.js`
- command: `bun run --filter @hominem/mobile test:e2e:auth:mobile`
- runtime: dedicated `APP_VARIANT=e2e` binary built from `hakumie2e`
- validates:
  - signed-out entrypoint visible
  - sign-in action reaches authenticated app shell
  - sign-out returns to signed-out entrypoint
- selectors are `testID`-driven instead of rendered-text driven

### Required non-production test env

API-side:

- `AUTH_E2E_ENABLED=true`
- `AUTH_E2E_SECRET=<shared-non-prod-secret>`

Mobile-side:

- `EXPO_PUBLIC_E2E_TESTING=true`
- `EXPO_PUBLIC_E2E_AUTH_SECRET=<same shared secret>`
- `EXPO_PUBLIC_API_BASE_URL=<test API URL>`
- `APP_VARIANT=e2e`

### Test behavior and guarantees

- Deterministic sign-in path avoids third-party provider flakiness in E2E.
- Test endpoint issues real token pair shape used by mobile auth flows.
- Endpoint is guarded by env + secret and not exposed in production mode.
- Mobile passkey flow is currently not exposed in app runtime UX; passkey E2E assertions remain web-only in this proposal phase.
- The E2E runtime is intentionally isolated from dev-client launcher behavior to reduce startup flakiness and Detox idle false positives.
- Current open blocker: Detox bootstrap can fail before shell resolution (`auth-screen`/start screen visibility timeout).

## Operational Notes

- If mobile auth fails at callback/exchange in non-prod, verify Redis first (mobile flow state is Redis-backed).
- If API returns invalid redirect errors, verify mobile deep-link scheme/URI registration and allowlist prefixes.
- If E2E login fails with 403/404, verify both secret alignment and `AUTH_E2E_ENABLED` state.

## Source References

- `services/api/src/routes/auth.ts`
- `services/api/src/auth/better-auth.ts`
- `services/api/src/env.ts`
- `apps/mobile/lib/auth-client.ts`
- `apps/mobile/utils/auth-provider.tsx`
- `apps/mobile/README.md`
