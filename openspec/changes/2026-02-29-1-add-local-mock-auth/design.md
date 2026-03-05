## Context

Currently, the development team has no way to test Apple Authentication features locally without:
1. Configuring real Apple credentials
2. Using a Cloudflare tunnel (per-machine, doesn't scale)
3. Pushing code to staging for any auth testing

This friction creates a barrier to local development, reduces iteration speed, and complicates onboarding. The team needs to develop and test authentication flows in a shared codebase that works identically for all developers.

**Current State:**
- No authentication system in place locally
- Apple Auth setup documented as staging-only
- Each developer would need individual tunnel configuration
- No session management or auth context in React apps

**Constraints:**
- Must work with existing Hono RPC architecture
- Cannot require per-machine setup (must be git-versioned)
- Mock auth responses must match real Apple Auth format exactly
- Must support transition to real Apple Auth on staging without code changes

## Goals / Non-Goals

**Goals:**
- Enable all developers to test authentication locally with zero setup friction
- Provide environment-based switching between mock (local) and real (staging/production) auth
- Create reusable authentication hooks and context for React applications
- Define consistent types for authentication across the entire stack
- Support session persistence so auth state survives page reloads
- Make onboarding new developers require only `bun install` and `bun run dev`

**Non-Goals:**
- Setting up real Apple Authentication locally (happens on staging only)
- Implementing multi-factor authentication for mock auth
- Supporting OAuth providers other than Apple (future work)
- Building admin tools for session management
- Creating a full user management system (out of scope for auth component)

## Decisions

### Decision 1: Environment-based Provider Selection (Factory Pattern)
**Choice**: Use environment variables to select between mock and real auth providers at startup, implemented as a factory pattern.

**Rationale**: 
- Simple and explicit - no magic, easy to understand which auth is active
- Follows existing environment configuration pattern in codebase
- Zero runtime overhead - decision made once at startup
- Works with both local development and CI/CD environments

**Alternatives Considered**:
- **Feature flags** (would require backend dependency for local dev, unnecessary complexity)
- **Dependency injection at module level** (requires wiring through many layers)
- **Mock provider via module aliasing** (not compatible with TypeScript/Vite)

**Implementation**:
```typescript
// Evaluated at startup, never changes during runtime
const AUTH_CONFIG = {
  useMockAuth: process.env.VITE_USE_MOCK_AUTH === 'true',
  appleAuthEnabled: process.env.VITE_APPLE_AUTH_ENABLED === 'true',
}
```

### Decision 2: React Context for Auth State (Not Redux/Zustand)
**Choice**: Use React Context API + hooks for authentication state management.

**Rationale**:
- Built into React, no external dependency
- Sufficient for auth state (user, loading, error states)
- Easier to understand and debug than external store
- Lighter bundle size

**Alternatives Considered**:
- **Redux** (overkill for auth state, more boilerplate)
- **Zustand** (external dependency, not needed for this use case)
- **Prop drilling** (creates component coupling, hard to maintain)

**Implementation**:
- Single `AuthContext` with provider wrapping app root
- `useAuth` hook for accessing context throughout app
- Session storage in localStorage for persistence

### Decision 3: Mock User Data in Code (Not Database)
**Choice**: Store mock user configurations in code as constants/fixtures.

**Rationale**:
- Zero external dependencies for local development
- Developers can quickly create test users in code
- No database setup needed
- Easy to simulate different user scenarios

**Alternatives Considered**:
- **LocalStorage for persistence** (works but doesn't survive `rm -rf node_modules`)
- **In-memory database** (unnecessary for mock data)
- **JSON file fixtures** (requires file I/O, more complex)

**Implementation**:
```typescript
export const MOCK_USERS = {
  developer: { id: 'dev-1', email: 'dev@example.com', name: 'Developer User' },
  tester: { id: 'qa-1', email: 'qa@example.com', name: 'QA User' },
}
```

### Decision 4: Shared Type Definitions in @hominem/hono-rpc
**Choice**: Define User, Session, and Auth types in @hominem/hono-rpc (shared package).

**Rationale**:
- Already used for API type safety
- Ensures consistency between client and server
- Prevents type drift between mock and real implementations
- Follows existing architecture pattern

**Implementation**:
- Add `auth.ts` to @hominem/hono-rpc/types
- Export User, Session, AuthRequest, AuthResponse types
- Both mock and real implementations use these types

### Decision 5: Session Storage in localStorage (Not SessionStorage)
**Choice**: Use localStorage for persistence across browser sessions.

**Rationale**:
- Sessions should survive browser restart (reasonable for mock auth)
- Matches expected behavior of real Apple Auth (persistent session)
- Easier to test than SessionStorage
- Can be cleared on logout or with app cleanup

**Implementation**:
- Store session token in localStorage when user signs in
- Restore from localStorage on app initialization
- Clear on logout

## Risks / Trade-offs

### [Risk] Mock auth isn't truly representative
**Mitigation**: Mock auth uses exact same types and response format as real auth. The main difference is the token validation logic - but this is tested on staging. Developers should test real flows on staging before merging to main.

### [Risk] Developers forget to test on staging
**Mitigation**: Document that Apple Auth testing always happens on staging. Make it clear in code comments and error messages. CI/CD step can enforce tested staging deployment before production.

### [Risk] Mock user data gets out of sync with real user properties
**Mitigation**: Share User type definition with both mock and real implementations. TypeScript will catch missing properties. Add tests that verify mock response matches User type.

### [Risk] localStorage security concerns
**Mitigation**: Mock auth tokens are not cryptographically valid - they're just identifiers. In production (real auth), tokens come from Apple and are validated server-side. localStorage is safe for mock tokens in development.

### [Risk] Team members with different mock users
**Mitigation**: MOCK_USERS is committed to git - all developers have same mock users. Can be extended in code for testing specific scenarios.

## Migration Plan

**Phase 1: Implementation** (this PR)
- Create mock auth provider
- Add AuthContext and hooks
- Implement environment-based selection
- Add shared types

**Phase 2: Integration** (next PR)
- Update React apps to use new AuthContext
- Add protected routes
- Remove any existing auth code
- Test with mock auth locally

**Phase 3: Staging Setup** (separate effort)
- Configure real Apple Auth on staging
- Test real auth flow
- Document staging setup

**Rollback**: This change is additive and non-breaking. If issues occur, developers simply revert to using mocked auth or fall back to staging. Rollback is git reset.

## Open Questions

1. **Should we support multiple simultaneous mock users?** (different sign-in per tab) - Probably not needed initially, can add later
2. **What should happen if real Apple credentials are partially configured?** (some env vars missing) - Should error clearly at startup
3. **Should mock auth log what it's doing?** (for debugging) - Yes, add debug logging in development
