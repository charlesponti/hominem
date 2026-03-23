# Hakumi Mobile (iOS)

This app is the iOS client for Hakumi, the notes-first personal workspace, built with Expo Router and Better Auth-backed API flows.

## Variant Model

The mobile app uses explicit runtime variants. `APP_VARIANT` controls app identity, native generation, and local env loading.

| Variant | Purpose | Native Shape | OTA Updates | Primary Command |
| --- | --- | --- | --- | --- |
| `dev` | local feature development | Expo dev client + Metro | disabled | `bun run start` |
| `e2e` | deterministic mobile test runtime | standalone native test app | disabled | `bun run test:e2e:build:ios` |
| `preview` | internal QA / release candidate | standalone update-enabled build | preview channel | `bun run build:preview` |
| `production` | App Store / TestFlight | standalone update-enabled build | production channel | `bun run build:production` |

## Native Generation Rules

- `APP_VARIANT` is the single source of truth for app identity, bundle identifier, URL scheme, dev-client inclusion, and Expo updates behavior.
- Only `dev` includes `expo-dev-client` and connects to Metro.
- `e2e`, `preview`, and `production` exclude the dev client and generate standalone native projects.
- Only `dev` and `e2e` may source local `.env.*.local` files. `preview` and `production` must use EAS-managed environments.
- `bun run prebuild:dev` and `bun run prebuild:e2e` are variant-aware and regenerate `ios/` when the requested native shape changes.
- Do not hand-edit generated `ios/Podfile`, `Expo.plist`, or project naming to switch variants. Regenerate through the variant prebuild scripts instead.

## Runtime Scope

- Production target: iOS only
- Authentication: Email + OTP via Better Auth API
- API: `@hominem/rpc` via authenticated HTTP requests

## Environment Variables

### Development (`.env.development.local`, `APP_VARIANT=dev`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
EXPO_APPLE_TEAM_ID="<apple-team-id>"
EXPO_PUBLIC_PASSKEY_RP_DOMAIN="api.ponti.io"
EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED="false"
```

### E2E (`.env.e2e.local`, `APP_VARIANT=e2e`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="true"
EXPO_PUBLIC_E2E_AUTH_SECRET="<shared-non-prod-secret>"
```

### Preview (`APP_VARIANT=preview`, EAS environment: `preview`)

Set these in the project `preview` environment on EAS, not in a local `.env` file:

```bash
EXPO_PUBLIC_API_BASE_URL="https://api.ponti.io"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED="false"
EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED="false"
EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED="false"
EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED="false"
EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED="false"
```

### Production (`APP_VARIANT=production`, EAS environment: `production`)

Set these in the project `production` environment on EAS, not in a local `.env` file:

```bash
EXPO_PUBLIC_API_BASE_URL="https://api.ponti.io"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED="true"
EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED="true"
EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED="true"
EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED="true"
EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED="false"
```

## Development

From monorepo root:

```bash
bun run dev --filter @hominem/mobile
```

From mobile app directory (`dev` variant):

```bash
bun run start
```

### Variant-specific prebuild

```bash
bun run prebuild:dev
bun run prebuild:e2e
```

If you switch from simulator Detox work back to a physical-device dev build, run `bun run prebuild:dev` before `bun run ios` so the generated iOS project includes the dev launcher again.

### Local device signing

- Set `EXPO_APPLE_TEAM_ID` in `.env.development.local` before generating or building a physical-device `dev` app.
- Set `EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED=true` only when you are actively validating the mobile passkey surface.
- Expo maps `ios.appleTeamId` from app config into the generated Xcode project, which keeps `dev` builds reproducible after a clean prebuild.
- The `e2e` simulator workflow does not require a development team.

## Detox E2E

### Prerequisites

- Xcode command line tools
- iOS simulator available (`iPhone 17 Pro`)
- `applesimutils` installed (`brew tap wix/brew && brew install applesimutils`)
- API server running and configured for non-production E2E auth (`AUTH_E2E_ENABLED=true`)

### Run E2E

```bash
# build clean simulator binary (no dev client)
bun run test:e2e:build:ios

# full mobile auth e2e
bun run test:e2e

# targeted smoke
bun run test:e2e:smoke
```

### Auth model in E2E

- Mobile auth is email + OTP across development and E2E.
- E2E tests request OTP via `/api/auth/email-otp/send` and fetch deterministic OTP via `/api/auth/test/otp/latest`.
- OTP lookup requires `x-e2e-auth-secret` matching `AUTH_E2E_SECRET` on API.
- Test OTP retrieval remains disabled in production.
- Detox selectors are `testID`-driven:
  - `auth-screen`
  - `auth-email-input`
  - `auth-send-otp`
  - `auth-otp-input`
  - `auth-verify-otp`
  - `account-screen`
  - `account-sign-out`

## Auth Testing

```bash
bun run test:unit:auth
bun run test:integration:auth
bun run test:screens:auth
bun run test:routes:auth
bun run test:e2e:build:ios
bun run test:e2e:auth:critical
bun run test:e2e:smoke
```

- `jest-expo` plus React Native Testing Library cover auth screen behavior.
- `expo-router/testing-library` covers route-level auth navigation and deep-link hydration.
- Detox covers native-critical auth and relaunch flows.
- personal-device smoke covers final hardware-specific auth validation.
- Mobile passkey buttons are hidden by default behind `EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED`.

## EAS Builds

### Prerequisites

1. **Apple Developer Account** with App Store Connect access
2. **EAS CLI** installed: `npm install -g eas-cli`
3. **Expo account** linked: `eas login`

### Setup Credentials

```bash
# Configure Apple API key for EAS (required for CI)
eas credentials

# Or set environment variables for CI:
# EXPO_APPLE_ID, EXPO_APPLE_PASSWORD, EXPO_APPLE_TEAM_ID
```

### Build Commands

```bash
bun run build:development
bun run build:e2e
bun run build:preview
bun run build:production
bun run build:update:preview
bun run build:update:production
```

### TestFlight Deployment

For production TestFlight deployment, ensure Apple credentials are configured:

```bash
# Build for production
bun run build:production

# Submit to TestFlight (requires credentials)
eas submit --platform ios --latest
```

## Device Auth Smoke Checklist

1. Set `EXPO_APPLE_TEAM_ID`, run `bun run prebuild:dev`, and install the generated development build on iPhone.
2. Launch app and complete email + OTP sign-in.
3. Verify protected data screen loads from API without auth error.
4. Sign out and verify app returns to signed-out state.
5. Relaunch app and verify refresh-token session restore works.
6. For passkey add/sign-in on a real device, use a backend configured with a stable HTTPS passkey domain (`AUTH_PASSKEY_RP_ID` / `AUTH_PASSKEY_ORIGIN`), not a local IP or `localhost`.

## Auth Readiness

- Read the closeout matrix in [tests/AUTH_READINESS.md](/Users/charlesponti/Developer/hominem/apps/mobile/tests/AUTH_READINESS.md) before signing off mobile auth changes.
- Detox is the repo-standard native-critical auth harness.
- The `dev` and `e2e` native projects are intentionally different; always regenerate when switching harnesses.
- A final personal-device smoke pass is required before sign-off.

## Architecture

### Auth State Machine

The app uses a deterministic state machine for authentication state management (`utils/auth/types.ts`):

```
BOOTING → AUTHENTICATED/UNAUTHENTICATED/ERROR
   ↑           ↓
   └────── SIGN_IN/SIGN_OUT events
```

**Benefits:**
- Eliminates race conditions in auth flow
- Predictable state transitions
- Proper async operation cancellation via AbortController
- Easy to test and debug

**Key Files:**
- `utils/auth/types.ts` - State machine types and reducer
- `utils/auth-provider.tsx` - Auth provider using state machine

### Error Boundaries

Three-tier error handling system:

1. **Root Error Boundary** (`components/error-boundary/root-error-boundary.tsx`)
   - Catches unhandled errors at app level
   - Provides recovery options

2. **Feature Error Boundaries** (`components/error-boundary/feature-error-boundary.tsx`)
   - Wraps individual features (Chat, Focus, Auth)
   - Allows partial functionality when one feature fails

3. **Error Logging** (`utils/error-boundary/log-error.ts`)
   - Centralized error tracking
   - Contextual information for debugging

### State Consolidation

**Chat State:** Single source of truth with React Query
- Removed triple-state architecture (AI SDK + React Query + SQLite)
- React Query cache is the active state
- SQLite is persistence layer only
- Optimistic updates with automatic rollback

**Focus Items:** Server state with local fallback
- React Query for server state
- SQLite for offline persistence
- Automatic refetch when online

### Runtime Validation

Zod schemas for type-safe API responses (`utils/validation/schemas.ts`):
- `ChatMessageSchema` - Chat message validation
- `FocusItemSchema` - Focus item validation  
- `UserProfileSchema` - User profile validation
- `NoteSchema` - Note validation

Replaces unsafe `as Type` assertions with runtime validation.

### Performance Optimizations

1. **FlashList Optimization** (`components/focus/focus-list.tsx`)
   - Memoized render items
   - Stable key extractor
   - `removeClippedSubviews` for memory efficiency

2. **Query Client Tuning** (`utils/query-client.ts`)
   - `staleTime: 60s` - Reduce unnecessary refetches
   - `gcTime: 10min` - Keep data in memory longer
   - Exponential backoff for retries
   - NetInfo integration for offline detection

3. **Effect Cleanup**
   - AbortController pattern for async operations
   - Proper timer/timeout cleanup
   - No memory leaks from abandoned promises

## iOS IDs

- Dev bundle ID: `com.pontistudios.hakumi.dev`
- E2E bundle ID: `com.pontistudios.hakumi.e2e`
- Preview bundle ID: `com.pontistudios.hakumi.preview`
- Prod bundle ID: `com.pontistudios.hakumi`
- Schemes:
  - `hakumi-dev`
  - `hakumi-e2e`
  - `hakumi-preview`
  - `hakumi`
