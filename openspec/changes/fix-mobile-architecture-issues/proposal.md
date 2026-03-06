## Why

The mobile app has accumulated critical architectural debt that causes race conditions, state management conflicts, and potential crashes in production. Auth boot logic has timing issues that can leave users stuck, the chat system manages state across three competing sources (React Query, AI SDK, SQLite), and type safety violations create runtime crash risks. These issues block reliable feature delivery and create a poor user experience.

## What Changes

### Critical Fixes

**1. Centralize Auth State Machine**
- Replace timeout-based boot logic with proper state machine
- Single auth guard in root layout (remove duplicate checks)
- Eliminate race conditions in session synchronization
- Add proper cleanup for async operations

**2. Consolidate Chat State Management**
- Remove triple-state architecture (AI SDK + React Query + SQLite)
- Implement single source of truth with React Query
- SQLite becomes persistence layer only, not active state
- Add proper optimistic updates and rollback

**3. Add Runtime Type Safety**
- Replace all `as Type` assertions with Zod validation
- Validate all API responses before use
- Add type guards for local storage data

**4. Implement Error Boundaries**
- Add global error boundary in root layout
- Add feature-level error boundaries for chat, focus, auth
- Create reusable error fallback components

**5. Fix Memory Leaks**
- Audit all effects for proper cleanup
- Standardize on `isMounted` pattern or AbortController
- Fix timer/timeout cleanup in auth provider

### Secondary Improvements

**6. Optimize Query Client Configuration**
- Integrate with NetInfo for network-aware caching
- Add proper retry strategies with backoff
- Configure gcTime appropriately for mobile constraints

**7. Refactor Storage Abstraction**
- Simplify LocalStore to single implementation (SQLite)
- Remove platform-specific branching logic
- Add data validation on read

**8. Add Unit Testing Infrastructure**
- Set up testing utilities for hooks
- Add tests for critical auth and chat logic
- Create testing patterns for React Query hooks

## Capabilities

### New Capabilities

- `mobile-auth-state-machine`: Centralized authentication state management with proper lifecycle
- `mobile-error-boundaries`: Error boundary system for graceful failure handling
- `mobile-state-consolidation`: Unified state management patterns for complex features

### Modified Capabilities

None. This is a refactoring change that improves implementation without changing requirements.

## Impact

### Affected Files

**Core Architecture:**
- `app/_layout.tsx` - Root layout with providers
- `app/(drawer)/_layout.tsx` - Remove duplicate auth check
- `utils/auth-provider.tsx` - Rewrite state machine
- `utils/api-provider.tsx` - Minor adjustments

**State Management:**
- `utils/query-client.ts` - Enhanced configuration
- `utils/services/chat/use-chat-messages.ts` - Consolidate state
- `utils/services/notes/use-focus-query.ts` - Add validation

**Storage:**
- `utils/local-store/index.ts` - Simplify abstraction
- `utils/local-store/sqlite.ts` - Add validation

**Components:**
- `components/chat/chat.tsx` - Add error boundary
- `components/focus/focus-list.tsx` - Performance optimization
- `components/error-boundary.tsx` - New file

### Breaking Changes

None. All changes are internal refactoring with no API or behavior changes visible to users.

### Dependencies

No new dependencies. Using existing:
- Zod (already in monorepo)
- React Query (already installed)
- Expo modules (already installed)

### Testing Strategy

- Unit tests for auth state machine
- Integration tests for chat state consolidation
- E2E tests continue to work (no user-facing changes)

### Migration

No migration needed. Changes are drop-in replacements.
