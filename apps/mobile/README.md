# Hominem Mobile (iOS)

This app is the iOS mobile client for Hominem, built with Expo Router and Better Auth-backed API flows.

## Runtime Scope

- Production target: iOS only
- Authentication: Apple Sign-In primary; mobile token bootstrap via Better Auth API
- API: `@hominem/hono-rpc` via authenticated HTTP requests

## Environment Variables

### Development (`.env.development.local`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
EXPO_PUBLIC_SENTRY_ENVIRONMENT="development"
```

### E2E (`.env.e2e.local`)

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_E2E_TESTING="true"
EXPO_PUBLIC_E2E_AUTH_SECRET="<shared-non-prod-secret>"
EXPO_PUBLIC_SENTRY_ENVIRONMENT="e2e"
```

### Production (`.env.production.local`)

```bash
EXPO_PUBLIC_API_BASE_URL="https://auth.ponti.io"
EXPO_PUBLIC_E2E_TESTING="false"
EXPO_PUBLIC_E2E_AUTH_SECRET=""
EXPO_PUBLIC_SENTRY_ENVIRONMENT="production"
```

## Development

From monorepo root:

```bash
bun run dev --filter @hominem/mobile
```

From mobile app directory:

```bash
bun run start
```

## Maestro E2E

### Prerequisites

- Java 17+ available in PATH
- Maestro CLI installed (`curl -Ls https://get.maestro.mobile.dev | bash`)
- Booted iOS simulator or connected iOS device
- API server running and configured for non-production E2E auth (`AUTH_E2E_ENABLED=true`)

### Recommended shell setup

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH:$HOME/.maestro/bin"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
```

### Run E2E

```bash
# all flows
bun run test:e2e

# targeted
bun run test:e2e:smoke
bun run test:e2e:auth
bun run test:e2e:focus
bun run test:e2e:chat
bun run test:e2e:recording
```

### Auth model in E2E

- In E2E mode (`EXPO_PUBLIC_E2E_TESTING=true`), tapping `[CONTINUE_WITH_APPLE]` uses deterministic non-production token bootstrap via `/api/auth/mobile/e2e/login`.
- The endpoint requires `x-e2e-auth-secret` matching `AUTH_E2E_SECRET` on API.
- This bypass is disabled in production (`NODE_ENV=production` or `AUTH_E2E_ENABLED=false`).

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
# simulator
bun run build:simulator:ios

# development build (device)
bun run build:dev:ios

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
2. Launch app and complete Apple sign-in.
3. Verify protected data screen loads from API without auth error.
4. Sign out and verify app returns to signed-out state.
5. Relaunch app and verify refresh-token session restore works.

## iOS IDs

- Dev bundle ID: `com.pontistudios.mindsherpa.dev`
- Prod bundle ID: `com.pontistudios.hakumi`
- Shared Apple/Expo non-secret identifiers: `config/apple-auth.settings.json`

## Live Auth Smoke Diagnostics

```bash
# cloud URL
bun run test:e2e:auth:live

# direct local API (bypass cloudflared/cloudflare edge)
bun run test:e2e:auth:live:local
```

If cloud URL fails with `502` and local succeeds, tunnel/edge routing is unhealthy.
