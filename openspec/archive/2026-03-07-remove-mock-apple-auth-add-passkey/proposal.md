## Why

The current authentication system has two parallel implementations that cause confusion and maintenance burden: a mock Apple authentication for local development (add-local-mock-auth) and real better-auth with passkeys. The mock auth was created as a workaround for Apple requiring public redirect URIs, but passkeys don't have this limitation. Additionally, Apple Sign In adds complexity without providing meaningful value since passkeys are the superior authentication method. We should consolidate on passkeys using the Bootstrap pattern (email OTP signup → add passkey) for a more secure and simpler auth system.

## What Changes

- Remove mock authentication provider from packages/auth (mock.ts, mock config, related code)
- Remove Apple OAuth from better-auth configuration
- Remove Apple-related client code (signInWithApple, linkApple, etc.)
- Implement Bootstrap flow: email OTP signup with optional passkey upgrade
- Update AuthProvider to use real better-auth with passkeys as primary auth method
- Clean up environment variables related to mock auth and Apple

### New Capabilities

- `bootstrap-passkey-auth`: Email OTP signup flow with optional passkey upgrade for faster future logins

### Modified Capabilities

- `user-auth`: Changes from Apple-based auth to passkey-based auth with email recovery

## Impact

- **packages/auth**: Remove mock provider, update client to use better-auth passkeys
- **services/api**: Remove Apple from better-auth social providers, add email OTP configuration
- **apps/***: Update auth UI to show email OTP signup and passkey upgrade prompts
- **Environment**: Remove VITE_USE_MOCK_AUTH, APPLE_CLIENT_ID, APPLE_CLIENT_SECRET
