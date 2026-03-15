## Context

Currently, `apps/finance` and `apps/rocco` are standalone React applications with domain-specific components, hooks, and utilities embedded directly in their app directories. These applications share common patterns but duplicate infrastructure like API clients, auth guards, and query configurations.

The `apps/notes` AI personal assistant app needs to access these features but cannot import them because they are trapped inside standalone applications. This forces either code duplication or a migration strategy.

Key observations:
- Both apps use nearly identical `lib/api/*` structures
- Both use React Query with similar patterns
- Both rely on `@hominem/ui` for primitives
- Existing packages (`@hominem/finance-services`, `@hominem/lists-services`, etc.) are backend-focused
- No frontend/domain-specific React packages exist yet

## Goals / Non-Goals

**Goals:**
- Extract all reusable components and hooks from apps/finance and apps/rocco
- Create 4 domain-specific React packages with clear boundaries
- Enable apps/notes to import and use these packages
- Consolidate duplicate API client code into shared locations
- Maintain type safety throughout the migration
- Preserve existing functionality while improving maintainability

**Non-Goals:**
- Rewriting components or changing their behavior
- Modifying existing service packages
- Creating new routes in notes app (will be separate change)
- Handling deployment or CI/CD changes (infrastructure concern)

## Decisions

### Package Naming Convention
**Decision:** Use `@hominem/<domain>-react` suffix for domain-specific React packages.

**Rationale:**
- Distinguishes from existing `-services` packages which are backend-focused
- Follows established npm conventions (e.g., `@tanstack/react-query`)
- Clear semantic meaning: "React components and hooks for X domain"

**Alternative Considered:** `@hominem/react-<domain>` - rejected because it groups by tech instead of domain

### Package Boundaries
**Decision:** Split into 4 domain-specific packages rather than 2 app-mirrors.

**Rationale:**
- Finance features (accounts, analytics, transactions) are independent of places/lists
- Lists and places in rocco have different lifecycles and use cases
- Invites cross-cut both lists and places but warrant separate package
- Allows fine-grained dependency management (notes may only need finance + lists)

### API Client Consolidation
**Decision:** Migrate duplicate `lib/api/*` code to `@hominem/hono-client` rather than creating new package.

**Rationale:**
- `@hominem/hono-client` already exists for RPC client functionality
- Keeps API infrastructure consolidated
- Reduces package sprawl
- hono-client is the right semantic home for React-specific RPC patterns

### Component Export Strategy
**Decision:** Export components both individually and as domain namespaces.

**Example:**
```typescript
// Individual exports
export { AccountList } from './accounts'
export { SpendingChart } from './analytics'

// Domain namespace
export * as Accounts from './accounts'
export * as Analytics from './analytics'
```

**Rationale:**
- Individual exports enable tree-shaking
- Namespaces provide discoverability and organization
- Matches patterns used by Radix UI and other successful libraries

### State Management
**Decision:** Keep Zustand stores in packages but allow apps to override providers.

**Rationale:**
- Stores like `useRunwayStore`, `useImportTransactionsStore` are domain-specific
- Should be usable independently in different apps
- Provider pattern allows apps to customize store instances if needed

### Test Migration
**Decision:** Migrate component tests with components; keep integration tests in apps.

**Rationale:**
- Unit tests for components belong with the component
- Integration tests (auth flows, e2e) test app-specific orchestration
- Keeps package tests fast and focused

## Risks / Trade-offs

### Breaking Changes in Consumer Apps
**Risk:** When we update existing packages (like `@hominem/hono-client`), apps/finance and apps/rocco may break during the transition.

**Mitigation:**
- Perform migration in phases: extract packages → update apps → deprecate old code
- Keep apps working with existing code until packages are stable
- Use TypeScript to catch breaking changes early

### Bundle Size Concerns
**Risk:** New packages may increase bundle size if apps import more than needed.

**Mitigation:**
- Use explicit exports (not `export *`) to enable tree-shaking
- Document which imports are heavy (e.g., charts, maps)
- Provide light-weight alternatives where possible

### Dependency Version Conflicts
**Risk:** Apps may depend on different versions of React Query, Recharts, etc.

**Mitigation:**
- Define peer dependencies in packages (React, React Query)
- Pin dev dependencies for consistent testing
- Use workspace:* protocol for internal packages

### Testing Coverage Gaps
**Risk:** Migrating tests may reveal they depend on app-specific setup.

**Mitigation:**
- Audit tests before migration
- Create package-specific test utilities
- Maintain coverage metrics during migration

### Migration Complexity
**Risk:** This is a large change affecting ~100+ files across 3 apps.

**Mitigation:**
- Phase the migration (finance-react first as it has most complex components)
- Focus on one package at a time
- Maintain working state after each phase

## Migration Plan

### Phase 1: Infrastructure Setup
1. Create package directories with proper structure
2. Set up shared tsconfig, build configs
3. Update root package.json workspace config
4. Create base package.json files with dependencies

### Phase 2: finance-react Package
1. Migrate hooks (use-analytics, use-budget, use-finance-data, etc.)
2. Migrate account components
3. Migrate analytics components
4. Migrate finance components
5. Migrate Plaid integration
6. Migrate stores
7. Set up package exports and build
8. Update apps/finance to use package (test import works)

### Phase 3: places-react Package
1. Migrate places hooks (use-places, use-people, useGeolocation)
2. Migrate map components
3. Migrate place detail components
4. Migrate Google Places integration
5. Set up package exports and build

### Phase 4: lists-react Package
1. Migrate lists hooks (use-lists)
2. Migrate list components
3. Set up package exports and build

### Phase 5: invites-react Package
1. Migrate invites hooks (use-invites)
2. Migrate invite components
3. Set up package exports and build

### Phase 6: Consolidation
1. Update apps/notes to import required packages
2. Remove duplicate code from apps/finance and apps/rocco
3. Run full test suite
4. Verify no regression in functionality

### Rollback Strategy
- Each phase should leave apps in working state
- If issues arise, revert to previous package version
- Keep original app code until final deprecation
- Feature flags can disable new imports if needed

## Open Questions

1. **Q:** Should we migrate the `api/*` files to `@hominem/hono-client` or keep separate `@hominem/api-react`?
   **Status:** Leaning toward hono-client but need to verify it doesn't bloat non-React consumers.

2. **Q:** How do we handle the `routes/*` files? They're app-specific but may contain useful patterns.
   **Status:** Keep in apps initially. May extract common route patterns later.

3. **Q:** Should stores like `useRunwayStore` remain global or be scoped to component trees?
   **Status:** Keep as Zustand stores but provide Provider wrappers for flexibility.

4. **Q:** Do we need to migrate test utilities and mocks?
   **Status:** Yes, create `@hominem/testing` or add to relevant packages.
