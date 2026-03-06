## 1. Foundation & Setup

- [x] 1.1 Install Zod if not already available in mobile package
- [x] 1.2 Create directory structure for new utilities: `utils/auth/`, `utils/error-boundary/`, `utils/validation/`
- [x] 1.3 Set up unit testing configuration for hooks with React Query provider wrapper
- [x] 1.4 Create feature flag constants for gradual rollout

## 2. Auth State Machine Implementation

- [x] 2.1 Create `utils/auth/auth-state-machine.ts` with state reducer and actions
- [x] 2.2 Define auth state types: `AuthState`, `AuthEvent`, `AuthContext`
- [x] 2.3 Implement state transitions: BOOTING → AUTHENTICATED/UNAUTHENTICATED/ERROR
- [x] 2.4 Create `useAuthStateMachine` hook with AbortController cleanup
- [x] 2.5 Add comprehensive unit tests for all state transitions
- [x] 2.6 Create new `AuthProvider` using state machine
- [x] 2.7 Remove `sessionFingerprint` dependency anti-pattern
- [x] 2.8 Implement proper async operation cancellation
- [ ] 2.9 Add tests for concurrent operation handling

## 3. Navigation Auth Guard Consolidation

- [x] 3.1 Remove auth check from `app/(drawer)/_layout.tsx`
- [x] 3.2 Update root `app/_layout.tsx` auth guard logic
- [x] 3.3 Ensure single source of truth for auth-based routing
- [ ] 3.4 Test navigation flows: unauthenticated → auth → protected routes
- [ ] 3.5 Test deep linking scenarios with auth state
- [ ] 3.6 Verify no duplicate redirects or navigation loops

## 4. Runtime Type Validation (Zod Schemas)

- [x] 4.1 Create `utils/validation/schemas.ts` with Zod schemas for API types
- [x] 4.2 Define `ChatMessageSchema`, `FocusItemSchema`, `UserProfileSchema`
- [x] 4.3 Add validation to `useFocusQuery` - replace type assertions
- [x] 4.4 Add validation to `useChatMessages` - replace type assertions
- [x] 4.5 Add validation to `useSendMessage` - replace type assertions
- [x] 4.6 Add validation to `useStartChat` - replace type assertions
- [x] 4.7 Create type inference from schemas for TypeScript types
- [ ] 4.8 Add tests for schema validation with edge cases

## 5. Error Boundaries Implementation

- [x] 5.1 Create `components/error-boundary/root-error-boundary.tsx`
- [x] 5.2 Create `components/error-boundary/feature-error-boundary.tsx`
- [x] 5.3 Create reusable `ErrorFallback` component with retry/reset actions
- [x] 5.4 Add error logging utility in `utils/error-boundary/log-error.ts`
- [x] 5.5 Wrap root layout with RootErrorBoundary
- [x] 5.6 Wrap Chat feature with FeatureErrorBoundary
- [x] 5.7 Wrap Focus feature with FeatureErrorBoundary
- [x] 5.8 Wrap Auth screen with FeatureErrorBoundary
- [ ] 5.9 Test error boundaries by throwing test errors
- [ ] 5.10 Verify graceful degradation when features fail

## 6. Chat State Consolidation

- [x] 6.1 Create new `utils/services/chat/use-chat-messages-new.ts` (parallel implementation)
- [x] 6.2 Implement streaming adapter that updates React Query cache
- [x] 6.3 Remove AI SDK state duplication - use React Query as source
- [x] 6.4 Update SQLite persistence to read from React Query, not write to it
- [x] 6.5 Implement optimistic updates for send message
- [x] 6.6 Implement optimistic updates for message streaming
- [x] 6.7 Remove custom offline queue - use React Query's built-in retry
- [x] 6.8 Add proper query invalidation after mutations
- [ ] 6.9 Create migration path for existing chat data
- [ ] 6.10 Write integration tests for chat state flow
- [ ] 6.11 Benchmark performance before/after consolidation

## 7. Query Client Optimization

- [x] 7.1 Update `utils/query-client.ts` configuration
- [x] 7.2 Integrate `@react-native-community/netinfo` with React Query
- [x] 7.3 Configure `networkMode: 'offlineFirst'` for offline support
- [x] 7.4 Add exponential backoff for retries
- [x] 7.5 Optimize `gcTime` and `staleTime` for mobile constraints
- [ ] 7.6 Add query persistence integration with SQLite
- [ ] 7.7 Test offline/online transitions and cache behavior

## 8. Effect Cleanup & Memory Leak Fixes

- [x] 8.1 Audit all `useEffect` hooks in `utils/auth-provider.tsx`
- [x] 8.2 Replace `isMounted` flags with AbortController pattern
- [x] 8.3 Fix timer/timeout cleanup in auth effects
- [x] 8.4 Audit `components/chat/chat.tsx` effects
- [x] 8.5 Audit `components/focus/focus-list-item.tsx` effects
- [x] 8.6 Audit `utils/services/chat/use-chat-messages.ts` effects
- [x] 8.7 Standardize on single cleanup pattern across codebase
- [ ] 8.8 Add lint rule to enforce proper effect cleanup

## 9. Storage Abstraction Simplification

- [x] 9.1 Remove MSCCloudStore dependency from `utils/local-store/index.ts`
- [x] 9.2 Simplify to SQLite-only implementation
- [x] 9.3 Remove platform-specific branching logic
- [x] 9.4 Add data validation when reading from SQLite
- [x] 9.5 Update initialization logic
- [ ] 9.6 Test on both iOS and Android
- [ ] 9.7 Verify no data loss during transition
- [ ] 9.8 Remove unused native module references

## 10. Testing & Quality Assurance

- [x] 10.1 Write unit tests for auth state machine (all scenarios from spec)
- [ ] 10.2 Write unit tests for validation schemas
- [ ] 10.3 Write integration tests for chat state consolidation
- [ ] 10.4 Write integration tests for optimistic updates
- [ ] 10.5 Write integration tests for offline behavior
- [ ] 10.6 Update E2E tests if needed (no behavior changes expected)
- [ ] 10.7 Add error boundary tests
- [ ] 10.8 Run full test suite: `bun run test`
- [x] 10.9 Run type check: `bun run typecheck`
- [x] 10.10 Run lint: `bun run lint`
- [ ] 10.11 Test on physical iOS device
- [ ] 10.12 Test on physical Android device

## 11. Performance Optimization

- [x] 11.1 Audit FlashList usage in `components/focus/focus-list.tsx`
- [x] 11.2 Fix unnecessary re-renders in FocusListItem
- [x] 11.3 Optimize `keyExtractor` functions
- [x] 11.4 Memoize expensive computations
- [ ] 11.5 Profile app startup time before/after changes
- [ ] 11.6 Profile chat loading performance
- [ ] 11.7 Profile focus list scrolling performance
- [ ] 11.8 Document performance benchmarks

## 12. Documentation & Cleanup

- [x] 12.1 Update README with new architecture patterns
- [x] 12.2 Document auth state machine usage
- [x] 12.3 Document error boundary patterns
- [x] 12.4 Document state consolidation approach
- [ ] 12.5 Remove old implementation code after feature flag enablement
- [x] 12.6 Clean up unused imports and dependencies
- [ ] 12.7 Update code comments for clarity
- [ ] 12.8 Archive change with `openspec archive`

## 13. Rollout & Monitoring

- [ ] 13.1 Deploy with feature flags disabled (dark launch)
- [ ] 13.2 Enable feature flags for internal testing
- [ ] 13.3 Monitor error rates and crash reports
- [ ] 13.4 Gradually enable for beta users
- [ ] 13.5 Monitor performance metrics
- [ ] 13.6 Enable for all users if metrics look good
- [ ] 13.7 Keep old code for 1 week as rollback option
- [ ] 13.8 Remove feature flags and old code after stable
