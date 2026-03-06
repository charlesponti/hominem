## Why

Authentication across Hominem apps is currently inconsistent. Mobile, finance, notes, and rocco do not share a single app-facing auth model. Some flows still depend on legacy callback/session behavior, some use email OTP directly, and some assume different token/session shapes. This creates architectural drift, inconsistent UX, and increased risk of auth regressions.

Passkey support is the clearest place this inconsistency shows up: Better Auth can prove user identity and establish its own session, but app auth still depends on a separate Hominem token pair for protected API access. Until both OTP and passkey converge on the same app-session issuance contract, web and mobile will continue to drift.

## What Changes

Create a unified app authentication system for all first-party apps that:

- defines one canonical auth flow for web and mobile apps,
- standardizes app auth states, routes, API contracts, and storage behavior,
- makes email OTP and passkey the only end-user auth methods for apps,
- separates identity from credentials cleanly in app runtime behavior,
- treats Better Auth as the identity engine and Hominem tokens as the app session engine,
- requires every successful sign-in method to end in the same canonical token issuance contract,
- preserves Better Auth session continuity only where needed for passkey enrollment and management,
- removes legacy callback/session minting patterns from app flows,
- ensures all apps use Bearer tokens for protected API calls,
- makes auth boot and refresh behavior deterministic and loop-free.

### Breaking Changes

- **Web apps**: Remove `/auth/signin` and `/auth/callback` as primary auth routes. Migrate to `/auth` and `/auth/verify`.
- **All apps**: Stop using `/api/auth/session` for token minting. Only use it for identity checks.
- **Token storage**: Web apps must store refresh token in HttpOnly cookie instead of relying on Better Auth session cookies.
- **Passkey flows**: `/api/auth/passkey/auth/verify` must mint the same app token pair as `/api/auth/email-otp/verify`.

## Capabilities

### New Capabilities

- `app-auth-lifecycle`: Defines canonical auth state machine and lifecycle for all first-party apps (booting → signed_out → requesting_otp → otp_requested → verifying_otp → authenticating_passkey → refreshing_session → signed_in → signing_out → degraded).
- `app-auth-routes`: Defines canonical route structure for web auth surfaces (`/auth`, `/auth/verify`, `/auth/logout`, `/settings/security`).
- `app-auth-mobile-screens`: Defines canonical mobile auth screen/step model (`/(auth)/index`, `/(auth)/verify`).
- `app-auth-token-model`: Defines the single token model (accessToken + refreshToken) with storage strategy by platform (mobile: SecureStore, web: HttpOnly cookie).
- `app-auth-components`: Defines shared auth component contract for web (`AuthScaffold`, `EmailEntryForm`, `OtpVerificationForm`, `PasskeyButton`, `SessionExpiredDialog`, etc.) and mobile equivalents.
- `app-auth-boot-flow`: Defines deterministic boot flow for web and mobile with token refresh as the persistent session mechanism.
- `app-auth-passkey-flow`: Defines unified passkey authentication and enrollment UX within the same auth system.

Passkey capability in this change includes three distinct layers that must be implemented in order:

1. canonical passkey sign-in completion via app token issuance,
2. post-sign-in enrollment prompt and registration flow,
3. passkey management surfaces for viewing and deleting enrolled passkeys.

### Modified Capabilities

- `auth-unified-api`: The existing auth-unified-api spec addresses the React provider layer. This change extends it with app-facing auth contracts but does not modify its core requirements.

## Impact

### Affected Code

- `apps/finance/app/routes/auth/*` - migrate to canonical routes
- `apps/notes/app/routes/auth/*` - migrate to canonical routes
- `apps/rocco/app/routes/auth/*` - migrate to canonical routes
- `apps/mobile/utils/auth-provider.tsx` - align to canonical lifecycle
- `apps/mobile/components/authentication/*` - align to canonical components
- `packages/ui/src/components/*` - create shared auth components
- `packages/ui/src/hooks/use-api-client.ts` - align to new token model
- `packages/auth/*` - extend for new app auth contracts
- `services/api/src/routes/auth.ts` - ensure API contracts match
- `apps/mobile/lib/auth-client.ts` - preserve Better Auth passkey session/cookie continuity for Expo
- `apps/mobile/utils/use-mobile-passkey-auth.ts` - bridge passkey identity proof into canonical app tokens
- `packages/ui/src/hooks/use-passkey-auth.ts` - consume canonical passkey token contract on web

### Affected Systems

- Authentication API contracts
- Token storage and refresh mechanisms
- Auth boot and session lifecycle
- Protected route middleware behavior
