## Context

The mobile app (`apps/mobile`) is built with Expo and React Native, using:
- **Navigation**: Expo Router with file-based routing
- **State**: React Query (TanStack Query) for server state
- **Auth**: Better Auth with email OTP
- **Storage**: SQLite via expo-sqlite for local persistence
- **UI**: React Native with Reanimated for gestures

### Current Problems

**1. Auth State Machine Issues**
The auth provider uses a complex effect-based boot sequence with:
- 6-second timeout that races with session polling
- `sessionFingerprint` string that changes on every render
- No proper cleanup for async operations
- Duplicate auth checks in both root and drawer layouts

**2. Triple Chat State Architecture**
Chat manages state across three sources:
- AI SDK (`useChat` hook) for streaming
- React Query (`useQuery`/`useMutation`) for server sync
- SQLite (`LocalStore`) for persistence

These compete and create synchronization bugs.

**3. Type Safety Violations**
Multiple `as Type` assertions on API responses with no runtime validation.

**4. No Error Boundaries**
App crashes completely on any render error.

### Constraints

- Must maintain existing UI/UX (no user-facing changes)
- Must preserve offline capability
- Must work with existing Expo/React Native setup
- No new dependencies (use existing Zod, React Query)

## Goals / Non-Goals

**Goals:**
1. Eliminate auth race conditions with proper state machine
2. Consolidate chat state to single source (React Query)
3. Add runtime type validation for all API responses
4. Implement error boundaries for graceful failures
5. Fix all memory leaks in effects
6. Standardize effect cleanup patterns

**Non-Goals:**
- No changes to UI/UX design
- No changes to API contracts
- No new features (pure refactoring)
- No changes to build/deployment process
- No migration of existing user data required

## Decisions

### Decision 1: Auth State Machine Pattern

**Chosen**: Use explicit state machine with `useReducer` instead of multiple `useState` + `useEffect`.

```
States: BOOTING → AUTHENTICATING → AUTHENTICATED | UNAUTHENTICATED | ERROR

Events:
- SESSION_LOADED (from Better Auth)
- SESSION_EXPIRED
- SIGN_IN_REQUESTED
- SIGN_OUT_REQUESTED
- SYNC_COMPLETED
- SYNC_FAILED
```

**Rationale**: 
- Eliminates race conditions by serializing state transitions
- Makes all state changes explicit and testable
- Removes need for timeout-based logic
- Single source of truth for auth status

**Alternative Considered**: Keep useEffect but add better guards. Rejected because effects are inherently prone to race conditions with async operations.

### Decision 2: Single Navigation Guard

**Chosen**: Remove auth check from `(drawer)/_layout.tsx`, keep only in root `_layout.tsx`.

**Rationale**:
- Multiple guards create race conditions
- Root layout is the proper place for global auth routing
- Simpler mental model: one check, one redirect

### Decision 3: Chat State Consolidation

**Chosen**: React Query as single source of truth, SQLite as persistence layer.

```
Before (Triple State):
┌──────────┐   ┌──────────┐   ┌──────────┐
│ AI SDK   │   │  RQ      │   │  SQLite  │
│ (active) │   │ (sync)   │   │ (persist)│
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
              ┌──────────┐
              │  UI      │  (confused)
              └──────────┘

After (Single State):
┌─────────────────────────────────┐
│      React Query (Single)       │
│  ┌──────────┐   ┌──────────┐   │
│  │ Messages │   │  Chat    │   │
│  │  Query   │   │Mutation  │   │
│  └──────────┘   └──────────┘   │
└─────────────────────────────────┘
              │
     ┌────────┴────────┐
     ▼                 ▼
┌──────────┐     ┌──────────┐
│  AI SDK  │     │  SQLite  │
│(streaming│     │(persist) │
│ adapter) │     │          │
└──────────┘     └──────────┘
```

**Implementation**:
- Create custom hook `useStreamingMessages` that wraps AI SDK but updates React Query cache
- SQLite persists on successful mutations only
- No active reads from SQLite (only hydration on app start)

**Rationale**:
- React Query has built-in caching, background refetch, and optimistic updates
- Single state source eliminates synchronization bugs
- Easier to test and reason about

**Alternative Considered**: Keep triple state but add better sync logic. Rejected because complexity grows exponentially with each state source.

### Decision 4: Zod for Runtime Validation

**Chosen**: Validate all API responses with Zod schemas before use.

```typescript
const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().datetime(),
  // ...
})

const response = await client.api.chats[":id"].messages.$get({ param: { id } })
const data = ChatMessageSchema.array().parse(await response.json())
```

**Rationale**:
- Catches API contract violations early
- Provides clear error messages
- Type inference gives us TypeScript types for free

**Alternative Considered**: Type guards with manual checks. Rejected because Zod is already in the monorepo and provides better DX.

### Decision 5: Error Boundary Strategy

**Chosen**: Three-tier error boundary system.

```
┌─────────────────────────────────────────┐
│   Root Error Boundary (App-level)       │
│   - Full-screen error fallback          │
│   - Recovery: Restart app option        │
└─────────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Feature  │  │ Feature  │  │ Feature  │
│Boundary  │  │Boundary  │  │Boundary  │
│(Chat)    │  │(Focus)   │  │(Auth)    │
│- Inline  │  │- Inline  │  │- Inline  │
│fallback  │  │fallback  │  │fallback  │
└──────────┘  └──────────┘  └──────────┘
```

**Rationale**:
- Prevents total app crash on component errors
- Feature boundaries allow partial functionality
- Root boundary catches everything else

### Decision 6: Effect Cleanup Pattern

**Chosen**: Standardize on AbortController for async operations in effects.

```typescript
useEffect(() => {
  const abortController = new AbortController()
  
  const fetchData = async () => {
    try {
      const result = await api.fetch({ signal: abortController.signal })
      if (!abortController.signal.aborted) {
        setData(result)
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setError(error)
      }
    }
  }
  
  fetchData()
  
  return () => {
    abortController.abort()
  }
}, [dependency])
```

**Rationale**:
- Native browser/JS API, no custom flags needed
- Properly cancels in-flight requests
- Works with fetch, React Query, and most async libraries

**Alternative Considered**: `isMounted` boolean flag. Rejected because it doesn't actually cancel operations, just ignores results.

### Decision 7: Simplified Storage Abstraction

**Chosen**: Remove MSCCloudStore, use SQLite exclusively.

**Rationale**:
- MSCCloudStore was iOS-only and added complexity
- SQLite is cross-platform and well-tested
- Single implementation reduces bug surface
- E2E tests can mock SQLite or use in-memory

**Trade-off**: Slight performance difference (native vs SQLite), but negligible for our data volumes.

## Risks / Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Auth state regression** | Medium | High | Comprehensive unit tests for state machine; feature flag to rollback |
| **Chat data loss during migration** | Low | High | Maintain old implementation behind flag; gradual rollout; backup before migrate |
| **Performance degradation** | Low | Medium | Benchmark before/after; SQLite is fast enough for our scale |
| **New bugs in error boundaries** | Low | Medium | Test error boundaries explicitly; fallback to current behavior if boundary fails |
| **Type validation performance** | Very Low | Low | Zod is fast; schemas are small; validate at boundaries only |
| **Offline sync issues** | Medium | High | Extensive testing of offline scenarios; maintain optimistic updates |

### Key Trade-offs

1. **Complexity vs. Reliability**: Adding state machine and validation increases code volume but dramatically improves reliability.

2. **Consistency vs. Performance**: Single state source is slightly slower than triple-state (one less cache layer) but eliminates entire class of bugs.

3. **Strictness vs. Flexibility**: Runtime validation will catch some edge cases that were previously silently ignored. This might surface latent bugs.

## Migration Plan

### Phase 1: Foundation (Week 1)
1. Create new auth state machine hook (parallel to existing)
2. Create error boundary components
3. Add Zod schemas for API types
4. Set up unit testing infrastructure

### Phase 2: Auth Migration (Week 1-2)
1. Replace auth provider implementation
2. Remove duplicate navigation guards
3. Test auth flows extensively
4. Feature flag for rollback

### Phase 3: Chat State Consolidation (Week 2-3)
1. Create new chat hooks with single state
2. Update chat components
3. Migration script for existing chat data (if needed)
4. Test offline scenarios

### Phase 4: Validation & Polish (Week 3)
1. Add runtime validation to all queries
2. Add error boundaries to features
3. Fix any memory leaks found
4. Full regression testing

### Rollback Strategy

Each phase is behind a feature flag:
```typescript
const FEATURE_FLAGS = {
  NEW_AUTH_STATE: process.env.FF_NEW_AUTH === 'true',
  NEW_CHAT_STATE: process.env.FF_NEW_CHAT === 'true',
  RUNTIME_VALIDATION: process.env.FF_VALIDATION === 'true',
}
```

If issues arise, disable flag and revert to old implementation.

## Open Questions

1. **Should we maintain offline queue for chat starts?**
   Current implementation queues chat starts in AsyncStorage. With consolidated state, should we keep this or rely on React Query's retry mechanism?

2. **Do we need analytics on error boundary catches?**
   Should we track when error boundaries are triggered for monitoring?

3. **What's the performance budget for Zod validation?**
   Validate all API responses or just critical ones?

4. **Should auth state machine be generic?**
   Could this pattern be extracted for use in other apps?

5. **How do we test the state machine thoroughly?**
   Unit tests are clear, but what about integration testing of auth flows?
