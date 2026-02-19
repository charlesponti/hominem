# Hominem Mobile (iOS)

This app is the iOS mobile client for Hominem, built with Expo Router and the shared Hominem RPC/auth stack.

## Runtime Scope

- Production target: iOS only
- Authentication: Supabase OAuth (Apple provider) with PKCE
- API: `@hominem/hono-rpc` via `@hominem/hono-client`

## Environment Variables

### Development (`.env.development.local`)

Required for `bun run dev` or `bun run ios`:

```bash
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_SUPABASE_URL="https://gzgtqwrelfynzcpsnpxw.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
EXPO_PUBLIC_SENTRY_DSN="https://..."
EXPO_PUBLIC_SENTRY_ENVIRONMENT="development"
EXPO_PUBLIC_E2E_TESTING="false"
```

### E2E Testing (`.env.e2e.local`)

Required for Maestro tests:

```bash
E2E_TEST_EMAIL="e2e-test@mindsherpa.com"
E2E_TEST_PASSWORD="your-password"
EXPO_PUBLIC_API_BASE_URL="http://localhost:4040"
EXPO_PUBLIC_SUPABASE_URL="https://qgdiyyrpzgxxjgvqyjrx.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_LZYR8gTGxLsnh7u7colMWQ_KfJjte7I"
EXPO_PUBLIC_E2E_TESTING="true"
EXPO_PUBLIC_SENTRY_ENVIRONMENT="e2e"
```

**Important:** Do NOT use `#` comments in `.env` files when sourcing them in shell. Comments can cause syntax errors during Expo startup.

### Production (`.env.production.local`)

Used during EAS builds:

```bash
EXPO_PUBLIC_API_BASE_URL="https://mindsherpa-api-production.up.railway.app"
EXPO_PUBLIC_SUPABASE_URL="https://gzgtqwrelfynzcpsnpxw.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
EXPO_PUBLIC_SENTRY_DSN="https://..."
EXPO_PUBLIC_SENTRY_ENVIRONMENT="production"
EXPO_PUBLIC_E2E_TESTING="false"
```

## Development

From monorepo root:

```bash
bun run dev --filter @hominem/mobile
```

Or from this app directory:

```bash
bun run start
```

## E2E Testing (Maestro)

### Setup

1. Ensure the local API server is running on `localhost:4040`
2. Ensure test credentials exist in the test Supabase project
3. Source the E2E environment file:

```bash
set -a
source apps/mobile/.env.e2e.local
set +a
```

### Running Tests

From this app directory:

```bash
# Run all E2E tests
bun run test:e2e

# Run specific test suites
bun run test:e2e:auth      # Authentication flows
bun run test:e2e:focus     # Focus management
bun run test:e2e:chat      # Chat messaging
bun run test:e2e:recording # Audio recording
bun run test:e2e:smoke     # Quick app launch check
```

### Test Requirements

- API server running on `http://localhost:4040`
- Test credentials available in Supabase
- Maestro CLI installed (`brew install mobile-dev-tools` or `npm install -g maestro-cli`)
- iOS Simulator running with development build

### Troubleshooting Tests

**Login test fails with "E2E TEST LOGIN" not visible:**
- Check `.env.e2e.local` has `EXPO_PUBLIC_E2E_TESTING="true"`
- Verify test credentials exist in Supabase
- Ensure the app is built with development profile for E2E testing

**Tests timeout waiting for animations:**
- Verify API server is running and accessible
- Check that Supabase connectivity is working
- Increase timeout values in Maestro flows if needed

**Auth token not passed to API:**
- Verify `EXPO_PUBLIC_API_BASE_URL` matches running API server
- Check auth token is stored in secure storage via Supabase OAuth

**Error: "A required entitlement isn't present":**
- This is a Keychain access issue from `expo-secure-store`
- **Fix**: Rebuild the iOS app with proper entitlements:
  ```bash
  cd apps/mobile
  rm -rf ios/
  bun run prebuild
  bun run ios
  ```
- If that doesn't work, try a full simulator reset: `xcrun simctl erase all`
- See [iOS Build Configuration](#ios-build-configuration) for details

## Architecture

### Authentication

Mobile app uses Supabase OAuth (Apple Sign-In) with:
- **PKCE Flow**: Proof Key for Code Exchange for security
- **Secure Storage**: `expo-secure-store` for token persistence
- **Test Mode**: Optional test credentials for E2E testing (gated by `EXPO_PUBLIC_E2E_TESTING`)

### API Integration

- Uses `@hominem/hono-client/react` for type-safe RPC calls
- Auth token automatically injected in all API requests
- No direct database access (follows Hominem architecture rules)
- Shared types with server via `@hominem/hono-rpc`

## Building for EAS

```bash
# Simulator (development)
bun run build:simulator:ios

# Development build
bun run build:development:ios

# Preview/production
bun run build:production:ios
```

## iOS Build Configuration

### Keychain Entitlements

The iOS app uses `expo-secure-store` to securely store authentication tokens in the Keychain. This requires proper entitlements configuration:

- **Configuration**: Defined in `app.config.ts` via `expo-build-properties` plugin
- **Entitlements File**: `ios/mindsherpa/mindsherpa.entitlements`
- **Access Group**: `$(AppIdentifierPrefix)com.pontistudios.mindsherpa`

When building:
1. The config is read from `app.config.ts`
2. During prebuild, it generates/updates the entitlements file
3. Xcode signs the app with these entitlements
4. The app gains permission to store tokens in Keychain

**If you see "A required entitlement isn't present" error:**
```bash
# Regenerate iOS project with correct entitlements
cd apps/mobile
rm -rf ios/
bun run prebuild
bun run ios
```

### Other Important Configuration

- **App Transport Security**: Configured to allow Supabase and Railway API domains
- **Apple Sign-In**: Enabled via `expo-apple-authentication` plugin
- **Sentry Integration**: For error tracking in development/production
- **Audio Recording**: Permission configured via `expo-av` plugin
