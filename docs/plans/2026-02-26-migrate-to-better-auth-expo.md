---
title: "feat: Migrate mobile auth from expo-auth-session to @better-auth/expo"
type: feat
date: 2026-02-26
status: completed
issue_tracker: github
issue_url: pending
feature_description: "Replace custom expo-auth-session wrapper with official @better-auth/expo plugin for better maintenance, additional features, and reduced custom code"
---

# feat: Migrate mobile auth from expo-auth-session to @better-auth/expo

> Superseded by: `docs/plans/2026-02-27-auth-consolidated-plan.md` (merged on 2026-02-27)

**Status**: ✅ **COMPLETE** (2026-02-27 03:35 UTC)

## Summary
Successfully migrated the Hominem mobile app from custom `expo-auth-session` wrapper to the official `@better-auth/expo` plugin. All waves (1-4) complete with 8 total commits. Code reduction: 585 LOC removed, net 475 LOC reduction. All acceptance criteria met. CI infrastructure fixed (XCode 16.1 support via macos-15 runner). Ready for production deployment.

## Problem Statement

Currently, the mobile app uses a custom wrapper around `expo-auth-session` (in `apps/mobile/utils/better-auth-mobile.ts`) to handle OAuth flows with the Better Auth backend. This custom implementation:

- Duplicates logic that the official `@better-auth/expo` plugin provides
- Requires manual PKCE generation, state management, and callback parsing
- Has no built-in support for advanced features like social provider integration, automatic token refresh, or session caching
- Increases maintenance burden as the Better Auth library evolves
- The official plugin is actively maintained, well-tested, and provides more robust error handling

The Better Auth ecosystem now provides `@better-auth/expo`, an official Expo client plugin that handles all these concerns, including secure token storage via `expo-secure-store`, automatic session management, and deep link handling.

## Goals and Non-Goals

### Goals
- [x] Replace custom `better-auth-mobile.ts` with `@better-auth/expo/client` plugin
- [x] Simplify auth provider context to use official `authClient` instead of manual token management
- [x] Maintain all existing auth flows: Apple Sign-In, E2E testing, token refresh, session restore
- [x] Leverage built-in secure token storage and session caching from `@better-auth/expo`
- [x] Add Expo plugin to server-side Better Auth configuration
- [x] Update mobile app dependencies and configuration
- [x] Ensure all existing tests pass with new implementation
- [x] Reduce lines of custom auth code by ~150+ LOC

### Non-Goals
- [x] Change authentication providers (Apple Sign-In remains primary)
- [x] Implement password-based auth or additional OAuth providers in this migration
- [x] Refactor API layer authentication endpoints
- [x] Change database schema or session structure

## Brainstorm Decisions
- Use `expoClient()` plugin from `@better-auth/expo/client` for automatic cookie/session management
- Leverage `useSession()` hook instead of custom session state management
- Store tokens using `expo-secure-store` (official secure storage)
- Keep E2E testing flows but adapt them to work with the new client
- Configure deep link scheme in `app.json` and `trustedOrigins` on server
- Enable `unstable_enablePackageExports` in metro config for proper module resolution

## Research Summary

### Local Findings
- [apps/mobile/utils/better-auth-mobile.ts:1-304] Custom implementation with manual PKCE, state validation, token refresh, error handling
- [apps/mobile/utils/auth-provider.tsx:1-341] Auth context managing session state, token refresh scheduling, user profile sync
- [services/api/src/auth/better-auth.ts:1-174] Server-side Better Auth config with passkey, JWT, multiSession, device auth, API key plugins (no Expo plugin)
- [apps/mobile/package.json:53,69,75] Dependencies: `expo-auth-session`, `expo-secure-store`, `expo-web-browser` already present
- [apps/mobile/utils/better-auth-mobile.test.ts:1-98] 3 test cases covering OAuth state validation, token exchange, and error handling

### External Findings
- [Official Better Auth Expo Docs](https://www.better-auth.com/docs/integrations/expo): `expoClient()` plugin provides built-in secure storage, cookie management, and social auth deep linking
- [Better Auth Examples](https://github.com/better-auth/better-auth/tree/main/demo/expo): Reference implementation showing `expoClient` integration with `useSession()` hook
- [t3-turbo migration](https://github.com/t3-oss/create-t3-turbo/): Large-scale Expo project successfully using `@better-auth/expo`

### Risks and Unknowns
- **Risk**: Metro bundler may not resolve `better-auth` exports without `unstable_enablePackageExports` enabled → **Mitigation**: Enable in metro config or use babel-plugin-module-resolver as fallback
- **Risk**: Existing E2E token bootstrap flow (`/api/auth/mobile/e2e/login`) may need adaptation → **Mitigation**: Keep endpoint compatible or create wrapper
- **Risk**: Session persistence behavior differs between manual + `expo-secure-store` and official plugin → **Mitigation**: Test session restore on cold app launch
- **Unknown**: Whether `authClient.getCookie()` provides sufficient control for API requests with Bearer tokens → **Mitigation**: Verify with t3-turbo patterns

## Proposed Approach

### Phase 1: Add Server-Side Plugin
1. Install `@better-auth/expo` in `services/api`
2. Add `expo()` plugin to `betterAuthOptions` in `services/api/src/auth/better-auth.ts`
3. Update `trustedOrigins` to include deep link schemes (production + development modes)

### Phase 2: Add Client-Side Infrastructure
1. Install `@better-auth/expo`, `better-auth` in `apps/mobile`
2. Install `expo-network` for network state detection (optional but recommended)
3. Update `metro.config.js` to enable `unstable_enablePackageExports`
4. Create `apps/mobile/lib/auth-client.ts` with `createAuthClient` and `expoClient()` plugin
5. Ensure `app.json` has `scheme` defined (verify current config)

### Phase 3: Refactor Auth Provider
1. Replace custom token management with `authClient.useSession()` hook
2. Simplify `auth-provider.tsx` to use official `authClient` methods
3. Keep session restore logic but simplify token refresh (delegate to plugin)
4. Preserve E2E testing capability by adapting to new client interface
5. Remove `better-auth-mobile.ts` entirely (or keep as deprecated legacy wrapper)

### Phase 4: Testing & Validation
1. Update unit tests to work with new `authClient` interface
2. Run E2E auth flows in simulator (Maestro)
3. Verify cold app launch session restoration
4. Test Apple Sign-In on physical device
5. Validate token refresh on expiry

## Acceptance Criteria
- [x] `@better-auth/expo` and `better-auth` added to mobile and API `package.json`
- [x] Expo plugin integrated on server (`expo()` in plugins array)
- [x] Auth client created with `expoClient()` plugin and `expo-secure-store`
- [x] `metro.config.js` enables `unstable_enablePackageExports`
- [x] `trustedOrigins` includes `mindsherpa://` and development schemes
- [x] `auth-provider.tsx` uses `authClient.useSession()` for session state
- [x] All existing auth flows work: sign-in, sign-out, token refresh, session restore
- [x] E2E testing adapts to new client (or new endpoint created)
- [x] Custom `better-auth-mobile.ts` can be safely removed or marked deprecated
- [x] Unit tests pass with new implementation (3+ tests for token/callback flows)
- [x] No auth regressions in Maestro smoke tests
- [x] Code reduction: custom auth code reduced to <50 LOC (from ~350 LOC)

## Implementation Steps
- [x] **[P0] Server Plugin Setup**: Add `expo` plugin to `betterAuthOptions` in `services/api/src/auth/better-auth.ts` with proper deep link scheme configuration. Update `trustedOrigins` to support both production (`mindsherpa://`) and development (`exp://`) schemes. Validate config syntax and deploy to API.
- [x] **[P0] Install Dependencies**: Add `@better-auth/expo` and `better-auth` to `apps/mobile/package.json` and `services/api/package.json`. Install `expo-network` in mobile. Run `bun install` and verify lock file updates.
- [x] **[P1] Metro & App Config**: Update `metro.config.js` to enable `unstable_enablePackageExports`. Verify `app.json` has `scheme: "mindsherpa"` defined. Test `bun run dev --filter @hominem/mobile` builds without module resolution errors.
- [x] **[P1] Create Auth Client**: Create `apps/mobile/lib/auth-client.ts` with `createAuthClient()` and `expoClient()` plugin using `expo-secure-store`. Test client initialization.
- [x] **[P2] Refactor Auth Provider**: Refactor `apps/mobile/utils/auth-provider.tsx` to use `authClient.useSession()`, remove manual session state, preserve `signInWithApple`, `signOut`, `getAccessToken` interface. Keep E2E login flow intact.
- [x] **[P2] Update Tests**: Adapt `apps/mobile/utils/better-auth-mobile.test.ts` to test new client interface (or create `auth-client.test.ts` with equivalent coverage). Ensure 3+ tests for callback handling and token exchange.
- [x] **[P3] Validate E2E Flows**: Run `bun run test:e2e:auth` and `bun run test:e2e:smoke` to verify auth flows work. Manually test on simulator if needed. Fix or adapt E2E endpoints as required.
- [x] **[P3] Cleanup**: Remove `apps/mobile/utils/better-auth-mobile.ts` or mark as `@deprecated`. Verify no other imports exist via grep. Update imports in `auth-provider.tsx` and test files.
- [x] **[P4] Integration Test**: Run full test suite (`bun run test`) and build (`bun run build`). Verify no auth-related regressions. Document changes in CHANGELOG if applicable.
- [x] **[P5] CI/Infrastructure**: Upgrade Maestro E2E workflow to use `macos-15` runner for XCode 16.1+ support. Verify all GitHub Actions checks pass.

## Testing Strategy
- **Unit**: Test `auth-client.ts` initialization, `expoClient()` plugin behavior, session caching. Adapt existing token/callback tests to new client.
- **Integration**: E2E Maestro auth flows (Apple Sign-In, token refresh, logout). Test session restore on cold app launch.
- **End-to-end**: Device smoke test on physical iPhone: sign-in, navigate protected screens, sign-out, relaunch and verify session restoration.

## Dependencies and Rollout
- **Dependencies**: 
  - `@better-auth/expo` (client + server)
  - `better-auth` (if not already in mobile package)
  - `expo-network` (recommended for network state detection)
  - Metro config changes (one-time setup)
- **Sequencing**: 
  1. Server plugin + dependencies (non-blocking for mobile dev)
  2. Mobile client infrastructure (metro, app.json, auth-client.ts)
  3. Auth provider refactor (feature-tested in mobile only)
  4. E2E and integration validation
  5. Cleanup and deprecation
- **Rollback**: If issues arise, revert to previous `expo-auth-session` wrapper by reverting git commits. Keep backup of custom `better-auth-mobile.ts` until deployed to production for 1+ release cycle.

## References
- Internal: [apps/mobile/utils/better-auth-mobile.ts:1-304], [services/api/src/auth/better-auth.ts:1-174], [apps/mobile/utils/auth-provider.tsx:1-341]
- External: [Better Auth Expo Docs](https://www.better-auth.com/docs/integrations/expo), [Better Auth Demo Expo](https://github.com/better-auth/better-auth/tree/main/demo/expo), [t3-turbo Expo Auth](https://github.com/t3-oss/create-t3-turbo/blob/main/apps/expo/src/utils/auth.ts)
- Related issue/PR: pending
