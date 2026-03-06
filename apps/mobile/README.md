# Hominem Mobile (iOS)

This app is the iOS mobile client for Hominem, built with Expo Router and Better Auth-backed API flows.

## Variant Model

The mobile app uses explicit runtime variants. `APP_VARIANT` controls app identity, native generation, and local env loading.

| Variant | Purpose | Dev Client | OTA Updates | Primary Command |
| --- | --- | --- | --- | --- |
| `dev` | local feature development | yes | development channel | `bun run start` |
| `e2e` | deterministic Detox runtime | no | disabled | `bun run test:e2e:build:ios` |
| `preview` | internal QA / release candidate | no | preview channel | `bun run build:preview:ios` |
| `production` | App Store / TestFlight | no | production channel | `bun run build:production:ios` |

## Runtime Scope

- Production target: iOS only
- Authentication: Email + OTP via Better Auth API
- API: `@hominem/hono-rpc` via authenticated HTTP requests

## Environment Variables

### Development (`.env.development.local`, `APP_VARIANT=dev`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
```

### E2E (`.env.e2e.local`, `APP_VARIANT=e2e`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="true"
EXPO_PUBLIC_E2E_AUTH_SECRET="<shared-non-prod-secret>"
```

### Preview (`.env.preview.local`, `APP_VARIANT=preview`)

```bash
EXPO_PUBLIC_API_BASE_URL="https://api.hominem.test"
EXPO_PUBLIC_E2E_TESTING="false"
```

### Production (`.env.production.local`, `APP_VARIANT=production`)

```bash
EXPO_PUBLIC_API_BASE_URL="https://api.ponti.io"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
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
# development build (device)
bun run build:dev:ios

# dedicated e2e build
bun run build:e2e:ios

# preview/production
bun run build:preview:ios
bun run build:production:ios
```

### TestFlight Deployment

For production TestFlight deployment, ensure Apple credentials are configured:

```bash
# Build for production
bun run build:production:ios

# Submit to TestFlight (requires credentials)
eas submit --platform ios --latest
```

## Device Auth Smoke Checklist

1. Install the development build on iPhone (`bun run build:dev:ios`).
2. Launch app and complete email + OTP sign-in.
3. Verify protected data screen loads from API without auth error.
4. Sign out and verify app returns to signed-out state.
5. Relaunch app and verify refresh-token session restore works.

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
- Shared Apple/Expo non-secret identifiers: `config/apple-auth.settings.json`

## Live Auth Smoke Diagnostics

```bash
# cloud URL
bun run test:e2e:auth:live

# direct local API (bypass cloudflared/cloudflare edge)
bun run test:e2e:auth:live:local
```

If cloud URL fails with `502` and local succeeds, tunnel/edge routing is unhealthy.
