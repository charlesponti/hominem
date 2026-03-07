## 1. Remove Mock Authentication

- [x] 1.1 Delete packages/auth/src/providers/mock.ts
- [x] 1.2 Delete packages/auth/src/mock-users.ts
- [x] 1.3 Remove mock-related code from packages/auth/src/config.ts
- [x] 1.4 Remove VITE_USE_MOCK_AUTH from all .env templates
- [x] 1.5 Remove VITE_APPLE_AUTH_ENABLED from all .env templates
- [x] 1.6 Clean up any mock auth imports in packages/auth/src/index.ts

## 2. Remove Apple Authentication

- [x] 2.1 Remove apple from socialProviders in services/api/src/auth/better-auth.ts
- [x] 2.2 Remove APPLE_CLIENT_ID and APPLE_CLIENT_SECRET from env.ts
- [x] 2.3 Remove signInWithApple function from packages/auth/src/client.tsx
- [x] 2.4 Remove linkApple function from packages/auth/src/client.tsx
- [x] 2.5 Remove Apple-related UI components from apps
- [x] 2.6 Update AuthContext types to remove apple provider

## 3. Configure Email OTP in Better-Auth

- [x] 3.1 Enable emailAndPassword plugin in better-auth.ts (with email OTP only, no password)
- [x] 3.2 Configure email OTP settings (expiry, length, rate limiting)
- [x] 3.3 Ensure email sending is configured (check existing email setup)

## 4. Update Client Auth to Use New Flow

- [x] 4.1 Update packages/auth/src/client.tsx to use email OTP signup
- [x] 4.2 Update signIn function to use email OTP or passkey
- [x] 4.3 Add addPasskey function to AuthProvider
- [x] 4.4 Update session handling for new auth flow

## 5. Add Passkey Upgrade UI

- [x] 5.1 Create "Enable FaceID/TouchID" prompt component
- [x] 5.2 Add passkey upgrade prompt after email OTP login
- [x] 5.3 Add recurring prompt for users who skip initial setup
- [x] 5.4 Handle passkey registration errors gracefully

## 6. Update Apps

- [x] 6.1 Update apps/notes auth UI
- [x] 6.2 Update apps/rocco auth UI  
- [x] 6.3 Update apps/finance auth UI
- [x] 6.4 Update apps/mobile auth UI

## 7. Clean Up

- [x] 7.1 Update LOCAL_DEVELOPMENT.md documentation
- [x] 7.2 Remove add-local-mock-auth change artifacts
- [x] 7.3 Verify all tests pass: bun run test
- [x] 7.4 Verify typecheck passes: bun run typecheck

## 8. Testing

- [x] 8.1 Test email OTP signup flow end-to-end
- [x] 8.2 Test passkey registration after signup
- [x] 8.3 Test passkey sign-in
- [x] 8.4 Test email OTP sign-in (fallback)
- [x] 8.5 Test account recovery flow
- [x] 8.6 Test on localhost with real device biometrics
