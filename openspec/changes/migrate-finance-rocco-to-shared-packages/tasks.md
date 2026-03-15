## 1. Infrastructure Setup

- [ ] 1.1 Create `packages/finance-react/` directory structure (src/, dist/, tests/)
- [ ] 1.2 Create `packages/places-react/` directory structure
- [ ] 1.3 Create `packages/lists-react/` directory structure
- [ ] 1.4 Create `packages/invites-react/` directory structure
- [ ] 1.5 Create shared `tsconfig.json` for React packages (extends root config)
- [ ] 1.6 Create base `package.json` for finance-react with dependencies
- [ ] 1.7 Create base `package.json` for places-react with dependencies
- [ ] 1.8 Create base `package.json` for lists-react with dependencies
- [ ] 1.9 Create base `package.json` for invites-react with dependencies
- [ ] 1.10 Update root `package.json` workspace configuration to include new packages
- [ ] 1.11 Create `vite.config.ts` for each package for building
- [ ] 1.12 Set up `index.ts` export files for each package
- [ ] 1.13 Create `README.md` for each package documenting exports

## 2. API Client Consolidation (hono-client)

- [ ] 2.1 Analyze `apps/finance/app/lib/api/*` and `apps/rocco/app/lib/api/*` for common patterns
- [ ] 2.2 Move shared API provider/provider.tsx patterns to `packages/hono-client/react/`
- [ ] 2.3 Migrate React Query configuration defaults to hono-client
- [ ] 2.4 Create `useHonoQuery` and `useHonoMutation` hooks in hono-client if not present
- [ ] 2.5 Export React-specific client utilities from hono-client
- [ ] 2.6 Update finance and rocco apps to use consolidated API client
- [ ] 2.7 Verify no regressions in app API calls

## 3. finance-react Package Implementation

### 3.1 Hooks Migration
- [ ] 3.1.1 Migrate `use-analytics.ts` with tests
- [ ] 3.1.2 Migrate `use-budget.ts`
- [ ] 3.1.3 Migrate `use-finance-data.ts` with tests
- [ ] 3.1.4 Migrate `use-finance-top-merchants.ts`
- [ ] 3.1.5 Migrate `use-institutions.ts`
- [ ] 3.1.6 Migrate `use-monthly-stats.ts`
- [ ] 3.1.7 Migrate `use-plaid-accounts-by-institution.ts`
- [ ] 3.1.8 Migrate `use-plaid.ts`
- [ ] 3.1.9 Migrate `use-runway.ts`
- [ ] 3.1.10 Migrate `use-selected-account.ts`
- [ ] 3.1.11 Migrate `use-time-series.ts`
- [ ] 3.1.12 Create index.ts exporting all hooks

### 3.2 Account Components Migration
- [ ] 3.2.1 Migrate `account-connection-dialog.tsx`
- [ ] 3.2.2 Migrate `account-header.tsx`
- [ ] 3.2.3 Migrate `account-spending-chart.tsx`
- [ ] 3.2.4 Migrate `account-status-display.tsx`
- [ ] 3.2.5 Migrate `manual-institution-status.tsx`
- [ ] 3.2.6 Migrate `not-connected-status.tsx`
- [ ] 3.2.7 Migrate `plaid-account-status.tsx`
- [ ] 3.2.8 Migrate `plaid-status-badge.tsx`
- [ ] 3.2.9 Create accounts/index.ts namespace export

### 3.3 Analytics Components Migration
- [ ] 3.3.1 Migrate `analytics-chart-display.tsx`
- [ ] 3.3.2 Migrate `analytics-filters.tsx`
- [ ] 3.3.3 Migrate `analytics-statistics-summary.tsx`
- [ ] 3.3.4 Migrate `monthly-breakdown.tsx`
- [ ] 3.3.5 Migrate `top-merchants.tsx`
- [ ] 3.3.6 Migrate `top-tags.tsx`
- [ ] 3.3.7 Create analytics/index.ts namespace export

### 3.4 Finance/Transaction Components Migration
- [ ] 3.4.1 Migrate `budget-overview.tsx`
- [ ] 3.4.2 Migrate `category-select.tsx`
- [ ] 3.4.3 Migrate `account-select.tsx`
- [ ] 3.4.4 Migrate `date-month-select.tsx`
- [ ] 3.4.5 Migrate `group-by-select.tsx`
- [ ] 3.4.6 Migrate `transaction-filters.tsx`
- [ ] 3.4.7 Migrate `pagination-controls.tsx`
- [ ] 3.4.8 Migrate `sort-controls.tsx`
- [ ] 3.4.9 Migrate `sort-row.tsx`
- [ ] 3.4.10 Migrate `transactions-list.tsx`
- [ ] 3.4.11 Migrate `export-transactions.tsx`
- [ ] 3.4.12 Create finance/index.ts namespace export

### 3.5 Plaid Components Migration
- [ ] 3.5.1 Migrate `plaid-link.tsx`
- [ ] 3.5.2 Create plaid/index.ts export

### 3.6 Stores Migration
- [ ] 3.6.1 Migrate `useImportTransactionsStore` (store file)
- [ ] 3.6.2 Migrate `websocket-store.ts` patterns if needed
- [ ] 3.6.3 Create stores/index.ts export

### 3.7 Package Finalization
- [ ] 3.7.1 Create main `src/index.ts` with all exports
- [ ] 3.7.2 Build package and verify output
- [ ] 3.7.3 Run typecheck on package
- [ ] 3.7.4 Test imports in apps/finance (verify integration works)

## 4. places-react Package Implementation

### 4.1 Hooks Migration
- [ ] 4.1.1 Migrate `use-places.ts`
- [ ] 4.1.2 Migrate `use-people.ts`
- [ ] 4.1.3 Migrate `useGeolocation.ts`
- [ ] 4.1.4 Migrate `useGooglePlacesAutocomplete.ts`
- [ ] 4.1.5 Create hooks/index.ts export

### 4.2 Place Detail Components Migration
- [ ] 4.2.1 Migrate `PlaceAddress.tsx`
- [ ] 4.2.2 Migrate `PlacePhone.tsx`
- [ ] 4.2.3 Migrate `PlaceWebsite.tsx`
- [ ] 4.2.4 Migrate `PlaceRating.tsx`
- [ ] 4.2.5 Migrate `PlaceStatus.tsx`
- [ ] 4.2.6 Migrate `PlacePhotos.tsx`
- [ ] 4.2.7 Migrate `PlacePhotoLightbox.tsx`
- [ ] 4.2.8 Migrate `PlaceLists.tsx`
- [ ] 4.2.9 Migrate `PlaceMap.tsx`
- [ ] 4.2.10 Create places/detail/index.ts namespace export

### 4.3 Places List Components Migration
- [ ] 4.3.1 Migrate `places-list.tsx`
- [ ] 4.3.2 Migrate `places-nearby.tsx`
- [ ] 4.3.3 Migrate `places-autocomplete.tsx`
- [ ] 4.3.4 Migrate `place-row.tsx`
- [ ] 4.3.5 Migrate `place-list-item-actions.tsx`
- [ ] 4.3.6 Migrate `place-types.tsx`
- [ ] 4.3.7 Create places/list/index.ts namespace export

### 4.4 Visit Components Migration
- [ ] 4.4.1 Migrate `LogVisit.tsx`
- [ ] 4.4.2 Migrate `VisitHistory.tsx`
- [ ] 4.4.3 Migrate `PeopleMultiSelect.tsx`
- [ ] 4.4.4 Create places/visits/index.ts namespace export

### 4.5 Map Components Migration
- [ ] 4.5.1 Migrate `map.tsx`
- [ ] 4.5.2 Migrate `map.lazy.tsx`
- [ ] 4.5.3 Create places/map/index.ts export

### 4.6 Utilities Migration
- [ ] 4.6.1 Migrate `AddToListControl.tsx`
- [ ] 4.6.2 Migrate `AddToListDrawerContent.tsx`
- [ ] 4.6.3 Create places/utilities/index.ts export

### 4.7 Package Finalization
- [ ] 4.7.1 Create main `src/index.ts` with all exports
- [ ] 4.7.2 Build package and verify output
- [ ] 4.7.3 Run typecheck on package
- [ ] 4.7.4 Test imports in apps/rocco (verify integration works)

## 5. lists-react Package Implementation

### 5.1 Hooks Migration
- [ ] 5.1.1 Migrate `use-lists.ts`
- [ ] 5.1.2 Create hooks/index.ts export

### 5.2 List CRUD Components Migration
- [ ] 5.2.1 Migrate `list-form.tsx`
- [ ] 5.2.2 Migrate `list-row.tsx`
- [ ] 5.2.3 Migrate `lists.tsx` (main component)
- [ ] 5.2.4 Migrate `list-edit-dialog.tsx`
- [ ] 5.2.5 Migrate `list-edit-button.tsx`
- [ ] 5.2.6 Create lists/crud/index.ts namespace export

### 5.3 Place Management in Lists Migration
- [ ] 5.3.1 Migrate `add-place-control.tsx`
- [ ] 5.3.2 Migrate `add-to-list-control.tsx` (if not already in places-react)
- [ ] 5.3.3 Migrate `add-to-list-drawer-content.tsx` (if not already in places-react)
- [ ] 5.3.4 Create lists/places/index.ts namespace export

### 5.4 Collaboration Components Migration
- [ ] 5.4.1 Migrate `remove-collaborator-button.tsx`
- [ ] 5.4.2 Create lists/collaboration/index.ts export

### 5.5 Package Finalization
- [ ] 5.5.1 Create main `src/index.ts` with all exports
- [ ] 5.5.2 Build package and verify output
- [ ] 5.5.3 Run typecheck on package
- [ ] 5.5.4 Test imports in apps/rocco (verify integration works)

## 6. invites-react Package Implementation

### 6.1 Hooks Migration
- [ ] 6.1.1 Migrate `use-invites.ts`
- [ ] 6.1.2 Create hooks/index.ts export

### 6.2 Received Invites Components Migration
- [ ] 6.2.1 Migrate `ReceivedInviteItem.tsx`
- [ ] 6.2.2 Migrate `invites-empty-state.tsx` (from lists folder)
- [ ] 6.2.3 Create invites/received/index.ts namespace export

### 6.3 Sent Invites Components Migration
- [ ] 6.3.1 Migrate `sent-invite-form.tsx`
- [ ] 6.3.2 Migrate `sent-invite-item.tsx`
- [ ] 6.3.3 Migrate `sent-invites.tsx`
- [ ] 6.3.4 Create invites/sent/index.ts namespace export

### 6.4 Invite Action Components Migration
- [ ] 6.4.1 Migrate `delete-invite-button.tsx`
- [ ] 6.4.2 Create invites/actions/index.ts export

### 6.5 Package Finalization
- [ ] 6.5.1 Create main `src/index.ts` with all exports
- [ ] 6.5.2 Build package and verify output
- [ ] 6.5.3 Run typecheck on package
- [ ] 6.5.4 Test imports in apps/rocco (verify integration works)

## 7. Integration with apps/notes

- [ ] 7.1 Install finance-react as dependency in apps/notes
- [ ] 7.2 Install places-react as dependency in apps/notes
- [ ] 7.3 Install lists-react as dependency in apps/notes
- [ ] 7.4 Install invites-react as dependency in apps/notes
- [ ] 7.5 Create proof-of-concept import test in notes app
- [ ] 7.6 Verify build succeeds in apps/notes with new packages
- [ ] 7.7 Document available components/hooks for AI assistant integration

## 8. Deprecation and Cleanup

- [ ] 8.1 Update apps/finance to use finance-react imports (replace local imports)
- [ ] 8.2 Update apps/rocco to use places-react imports (replace local imports)
- [ ] 8.3 Update apps/rocco to use lists-react imports (replace local imports)
- [ ] 8.4 Update apps/rocco to use invites-react imports (replace local imports)
- [ ] 8.5 Remove duplicate component files from apps/finance (after verification)
- [ ] 8.6 Remove duplicate component files from apps/rocco (after verification)
- [ ] 8.7 Remove duplicate hook files from apps/finance (after verification)
- [ ] 8.8 Remove duplicate hook files from apps/rocco (after verification)
- [ ] 8.9 Run full test suite across all apps
- [ ] 8.10 Verify no regressions in apps/finance functionality
- [ ] 8.11 Verify no regressions in apps/rocco functionality
- [ ] 8.12 Mark apps/finance and apps/rocco as deprecated in README

## 9. Final Verification

- [ ] 9.1 Run `bun run typecheck` across entire monorepo
- [ ] 9.2 Run `bun run build` for all packages
- [ ] 9.3 Run `bun run test` for all packages
- [ ] 9.4 Run `bun run lint --parallel`
- [ ] 9.5 Run `bun run check` (safety check)
- [ ] 9.6 Verify all packages export correctly
- [ ] 9.7 Document any breaking changes in CHANGELOG
- [ ] 9.8 Create migration guide for future package consumers
