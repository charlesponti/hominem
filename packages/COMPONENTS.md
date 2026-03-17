# Shared React Packages — Component Inventory

> 60 components · 10 hooks · 10 stories

---

## `@hominem/finance-react`

Storybook: `bun run storybook` (port 6006)

### Accounts

| Component | Story |
|---|---|
| `AccountConnectionDialog` | |
| `AccountHeader` | |
| `AccountSpendingChart` | |
| `AccountStatusDisplay` | |
| `ManualInstitutionStatus` | |
| `NotConnectedStatus` | |
| `PlaidAccountStatus` | |
| `PlaidStatusBadge` | ✓ |

### Analytics

| Component | Story |
|---|---|
| `AnalyticsChartDisplay` | |
| `AnalyticsFilters` | |
| `AnalyticsStatisticsSummary` | |
| `MonthlyBreakdown` | |
| `TopMerchants` | ✓ |
| `TopTags` | ✓ |

### Finance / Transactions

| Component | Story |
|---|---|
| `AccountSelect` | ✓ |
| `CategorySelect` | ✓ |
| `DateMonthSelect` | ✓ |
| `ExportTransactions` | |
| `GroupBySelect` | |
| `PaginationControls` | ✓ |
| `ProgressBar` | ✓ |
| `SortControls` | |
| `SortRow` | |
| `TransactionFilters` | |
| `TransactionsList` | ✓ |

### Plaid

| Component | Story |
|---|---|
| `PlaidLink` | |
| `PlaidConnectButton` | |

### Hooks

- `useAnalytics`
- `useBudget`
- `useFinanceData`
- `useFinanceTopMerchants`
- `useInstitutions`
- `useMonthlyStats`
- `usePlaid`
- `usePlaidAccountsByInstitution`
- `useRunway`
- `useSelectedAccount`
- `useTimeSeries`

---

## `@hominem/places-react`

Storybook: `bun run storybook` (port 6007)

### Place Detail

| Component | Story |
|---|---|
| `PlaceAddress` | |
| `PlaceLists` | |
| `PlacePhone` | |
| `PlacePhotoLightbox` | |
| `PlacePhotos` | |
| `PlaceRating` | |
| `PlaceStatus` | |
| `PlaceWebsite` | |

### Places List

| Component | Story |
|---|---|
| `PlaceListItemActions` | |
| `PlaceRow` | |
| `PlacesAutocomplete` | |
| `PlacesList` | |
| `PlacesNearby` | |

### Map

| Component | Story |
|---|---|
| `PlaceMap` | |
| `LazyPlaceMap` | |

### Visits

| Component | Story |
|---|---|
| `LogVisit` | |
| `PeopleMultiSelect` | |
| `VisitHistory` | |

### Utilities

| Component | Story |
|---|---|
| `AddToListControl` | |
| `PlaceTypes` | ✓ |

### Hooks

- `useGeolocation`
- `useGooglePlacesAutocomplete`
- `usePeople` / `useCreatePerson`
- `usePlaces`

---

## `@hominem/lists-react`

Storybook: `bun run storybook` (port 6008)

### CRUD

| Component | Story |
|---|---|
| `ListEditButton` | |
| `ListEditDialog` | |
| `ListForm` | |
| `ListRow` | |
| `Lists` | |

### Collaboration

| Component | Story |
|---|---|
| `RemoveCollaboratorButton` | |

### Places (in Lists)

| Component | Story |
|---|---|
| `AddPlaceControl` | |
| `AddToListDrawerContent` | |

### Hooks

- `useLists` / `useListById` / `useCreateList` / `useUpdateList` / `useDeleteList`
- `useListsContainingPlace`
- `useRemoveCollaborator`

---

## `@hominem/invites-react`

Storybook: `bun run storybook` (port 6009)

### Received

| Component | Story |
|---|---|
| `InvitesEmptyState` | |
| `ReceivedInviteItem` | |

### Sent

| Component | Story |
|---|---|
| `SentInviteForm` | |
| `SentInviteItem` | |
| `SentInvites` | |

### Actions

| Component | Story |
|---|---|
| `DeleteInviteButton` | |

### Hooks

- `useSentInvites`
- `useReceivedInvites`
- `useCreateInvite`
- `useAcceptInvite`
- `useDeleteInvite`
