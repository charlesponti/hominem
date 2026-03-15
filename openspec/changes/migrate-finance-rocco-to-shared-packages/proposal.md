## Why

The apps/finance and apps/rocco applications contain rich domain-specific components and hooks that are currently trapped in standalone applications. By migrating these to shareable packages, we can consolidate our codebase, eliminate duplication, and integrate financial tracking, places discovery, and list management features directly into the notes AI personal assistant app. This enables a unified user experience while maintaining clean architectural boundaries.

## What Changes

- **Create 4 new domain-specific React packages**: `@hominem/finance-react`, `@hominem/places-react`, `@hominem/lists-react`, and `@hominem/invites-react`
- **Migrate ~75 components** from apps/finance and apps/rocco to appropriate packages
- **Migrate ~27 hooks** for data fetching and state management
- **Consolidate duplicate API client code** currently duplicated across apps
- **Update apps/notes** to import and use migrated components/hooks for AI assistant integration
- **Deprecate apps/finance and apps/rocco** once migration is complete
- **Update build configuration** and workspace dependencies

## Capabilities

### New Capabilities
- `finance-react`: React components and hooks for financial features (accounts, analytics, transactions, budgeting, Plaid integration)
- `places-react`: React components and hooks for places discovery (maps, place details, visits, Google Places integration)
- `lists-react`: React components and hooks for list management (create, edit, share lists)
- `invites-react`: React components and hooks for invite management (send, receive, manage invites)

### Modified Capabilities
- None - this is a code reorganization that does not change existing spec behavior

## Impact

- **Affected Apps**: apps/finance, apps/rocco, apps/notes
- **New Packages**: packages/finance-react, packages/places-react, packages/lists-react, packages/invites-react
- **API Changes**: None - components will maintain same props/interfaces
- **Dependencies**: React Query, Recharts, react-plaid-link, Google Maps libraries moved to packages
- **Build System**: Workspace dependencies updated, turbo pipeline adjusted
- **Testing**: Component tests migrate with components; integration tests remain in apps
