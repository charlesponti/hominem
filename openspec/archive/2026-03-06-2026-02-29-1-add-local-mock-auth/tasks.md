## 1. Setup and Configuration

- [x] 1.1 Create `packages/auth` monorepo package for shared auth code
- [x] 1.2 Add environment configuration: `.env.local` with VITE_USE_MOCK_AUTH=true, VITE_APPLE_AUTH_ENABLED=false
- [x] 1.3 Update @hominem/hono-rpc to include auth types and utilities
- [x] 1.4 Update package.json dependencies - no new dependencies needed (use built-ins)

## 2. Shared Types and Constants

- [x] 2.1 Create `packages/auth/types/auth.ts` with User, Session, AuthRequest, AuthResponse types
- [x] 2.2 Create `packages/auth/constants/mock-users.ts` with predefined mock user fixtures
- [x] 2.3 Add auth types to @hominem/hono-rpc/types/index.ts exports
- [x] 2.4 Create `packages/auth/config.ts` with getAuthConfig() factory function

## 3. Mock Authentication Provider

- [x] 3.1 Create `packages/auth/providers/mock.ts` with MockAuthProvider class
- [x] 3.2 Implement mockSignIn() - returns configured mock user + token
- [x] 3.3 Implement mockValidateToken() - validates mock tokens
- [x] 3.4 Implement mockSignOut() - clears session
- [x] 3.5 Create mock token generation (simple identifier-based, not cryptographic)

## 4. React Context and Hooks

- [x] 4.1 Create `apps/*/lib/auth/AuthContext.tsx` (or shared in packages)
- [x] 4.2 Create `useAuth()` hook that provides auth state
- [x] 4.3 Implement AuthProvider component that wraps app root
- [x] 4.4 Add localStorage persistence for auth session
- [x] 4.5 Create `useProtectedRoute()` hook for route protection

## 5. API Layer - Hono RPC

- [x] 5.1 Create `services/api/src/routes/auth.ts` with conditional endpoint routing
- [x] 5.2 Implement `POST /api/auth/signin` that calls mock or real provider based on config
- [x] 5.3 Implement `GET /api/auth/session` that returns current session if valid
- [x] 5.4 Implement `POST /api/auth/signout` 
- [x] 5.5 Add auth types to @hominem/hono-rpc exports
- [x] 5.6 Create middleware for token validation that works with mock and real tokens

## 6. Notes App Integration

- [x] 6.1 Wrap Notes app with AuthProvider
- [x] 6.2 Add Sign In button component using useAuth hook
- [x] 6.3 Create ProtectedRoute wrapper component
- [x] 6.4 Add user info display in header (when signed in)
- [x] 6.5 Test sign in/sign out flow with mock auth locally
- [x] 6.6 Test session persistence on page reload

## 7. Additional Apps (Rocco, Finance)

- [x] 7.1 Wrap Rocco app with AuthProvider
- [x] 7.2 Add Sign In button and protected routes to Rocco
- [x] 7.3 Wrap Finance app with AuthProvider
- [x] 7.4 Add Sign In button and protected routes to Finance

## 8. Environment and Build Configuration

- [x] 8.1 Ensure build process doesn't expose mock auth code in production builds
- [x] 8.2 Set up .env.local template in docs (copy for local dev)
- [x] 8.3 Update dev startup script to verify VITE_USE_MOCK_AUTH is set
- [x] 8.4 Create .env.staging template for staging deployment

## 9. Testing

- [x] 9.1 Create mock auth provider unit tests
- [x] 9.2 Create useAuth hook unit tests
- [x] 9.3 Create session persistence tests
- [ ] 9.4 Create integration test: sign in → protected route → sign out
- [ ] 9.5 Test that real auth setup works on staging (placeholder for staging PR)

## 10. Documentation

- [x] 10.1 Update LOCAL_DEVELOPMENT.md with auth setup instructions
- [x] 10.2 Document useAuth hook API with examples
- [x] 10.3 Document how to add protected routes to new apps
- [x] 10.4 Document mock user fixtures and how to modify them
- [x] 10.5 Add comments in code explaining mock vs real auth conditional logic
- [x] 10.6 Create DEVELOPERS.md with common auth debugging tips

## 11. Review and Cleanup

- [x] 11.1 Code review: mock auth provider implementation
- [x] 11.2 Code review: React context and hooks
- [x] 11.3 Code review: API endpoints
- [x] 11.4 Verify all tests pass: `bun run test`
- [x] 11.5 Verify typecheck passes: `bun run typecheck`
- [x] 11.6 Test manual flow: `bun run dev` → sign in → access protected route → sign out
- [x] 11.7 Cleanup: remove any debug logging or temporary code
