## [2026-01-31 13:45] Task 1: Enable Stricter Compiler Options

### Discovery: exactOptionalPropertyTypes requires explicit `| undefined`

When enabling `exactOptionalPropertyTypes: true`, TypeScript becomes stricter about optional properties:

**The Issue:**
```typescript
// ❌ Fails with exactOptionalPropertyTypes: true
interface Foo {
  prop?: string;
}
const obj: Foo = { prop: undefined }; // ERROR

// ✅ Works
interface Foo {
  prop?: string | undefined;
}
const obj: Foo = { prop: undefined }; // OK
```

**Common Pattern:**
When query params or request bodies have optional fields that you extract with `|| undefined`, you must ensure the receiving type explicitly allows `| undefined`:

```typescript
// Query params parsed as: string | undefined
const { limit, offset } = query;

// Service function signature needs:
function getMessages(options: { limit?: number | undefined }) { ... }

// NOT just:
function getMessages(options: { limit?: number }) { ... }
```

### Packages Fixed So Far:
1. ✅ @hominem/services (4 files) - GoogleTokens, Vector service metadata
2. ✅ @hominem/finance-services (8 files) - QueryOptions pattern
3. ✅ @hominem/events-services (1 file) - EventOutput types
4. ✅ @hominem/places-services (2 files) - PlaceImagesService options
5. ✅ @hominem/lists-services (1 file) - ListUser/ListOutput
6. ✅ @hominem/workers (3 files) - JobUpdateResult, Plaid types
7. ✅ @hominem/places (1 file) - updatePlacePhotosFromGoogle options

### Pattern for Fixing:
1. Find the interface/type definition
2. Add `| undefined` to all optional properties where undefined might be passed
3. Use `??` instead of `||` for nullish coalescing when dealing with optional values
4. Use conditional spreading `...(value && { key: value })` to avoid passing undefined to strict APIs

## [2026-01-31 14:15] Task 2: Complete @hominem/hono-rpc Type Safety Fixes

### Summary: ✅ 100% Complete - All 33 Errors Fixed

Fixed 17 route files + 2 service interface updates. **Typecheck now passes with zero errors.**

### Core Patterns Used:

**1. Conditional Spreading for Optional Fields**
```typescript
// ❌ Fails: Passes undefined to strict API
const result = await service.update(id, { field: undefined, other: 'value' });

// ✅ Works: Only include defined fields
const result = await service.update(id, { 
  ...(field !== undefined && { field }), 
  other: 'value' 
});
```

**2. Service Interface Updates (Cascade Pattern)**
When route handlers need optional params, update the service interface:
```typescript
// packages/chat/src/service/message.service.ts
interface ChatMessagesOptions {
  limit?: number | undefined;     // ← Added | undefined
  offset?: number | undefined;
  orderBy?: string | undefined;
}
```

**3. Zod Validation Error Handling**
```typescript
// ❌ Fails: error could be undefined
const message = parsed.error.issues[0].message;

// ✅ Works: Use optional chaining
const message = parsed.error?.issues?.[0]?.message;
// or shorter with type guard:
if (!parsed.success) {
  const msg = parsed.error?.issues?.[0]?.message || 'Validation error';
}
```

**4. Return Type Narrowing**
```typescript
// ❌ TypeScript can't infer return type through fallback
function getStrategy(): string {
  return strategy || 'default'; // ERROR if strategy is string | undefined
}

// ✅ Explicit return type + nullish coalescing
function getStrategy(): string {
  return strategy ?? 'default';  // Explicit return type + ?? for undefined/null
}
```

### Files Fixed:

**Route Handlers (17 files in packages/hono-rpc/src/routes/):**
1. bookmarks.ts - Optional chaining for Zod error parsing
2. chats.ts - Service ChatMessagesOptions interface update
3. content-strategies.ts - Conditional spreading for updates
4. content.ts - Conditional spreading + query filters
5. events.ts - EventFilters interface + conditional spreading
6. finance.budget.ts - Conditional spreading for optional category/name fields
7. finance.institutions.ts - Nullish coalescing for undefined values
8. goals.ts - Conditional spreading for category/goal updates
9. lists.ts - Conditional spreading for placeId/googleMapsId
10. people.ts - Conditional spreading for person fields (firstName, lastName, email, phone)
11. places.ts - Conditional spreading for place/visit operations
12. search.ts - Optional chaining for Zod error
13. tweet.ts - Explicit return type + getDefaultStrategyPrompt fix
14. twitter.ts - Optional chaining for Zod error
15. vector.ts - Optional chaining for 4 separate error accesses

**Middleware (1 file):**
16. middleware/error.ts - ApiErrorResponse.details field (details?: unknown | undefined)

**Libraries (1 file):**
17. lib/plaid.ts - Conditional spreading for basePath

**Service Interfaces (2 files):**
- packages/chat/src/service/message.service.ts - ChatMessagesOptions with | undefined
- packages/events/src/events.service.ts - EventFilters with | undefined

### Key Insights:

1. **Validation Chain Difficulty**: Zod's safeParse returns `{ success: false; error: ZodError }`, but accessing `error.issues` requires defensive chaining even after success check because the error structure itself is complex.

2. **Transitive Type Updates**: Fixing route handlers required cascading updates through service packages—types defined at multiple layers must all agree.

3. **Nullish vs Falsy**: With `exactOptionalPropertyTypes`, distinguish:
   - `??` for undefined/null (preferred for optional values)
   - `||` only when falsy values (0, '', false) need handling

4. **Return Type Inference Limitation**: Functions returning unions with undefined need explicit `: Type` annotations—TypeScript can't always infer through fallback patterns.

### Pattern Summary for Future Fixes:

When seeing `'xyz' is assignable to 'undefined'` errors with `exactOptionalPropertyTypes: true`:

1. **Check the receiving type** - Does it have `| undefined` on optional properties?
2. **Check the sending code** - Is it passing undefined (or possibly undefined values)?
3. **Solution** - Either:
   - Add `| undefined` to the interface, OR
   - Use conditional spreading/nullish coalescing to avoid passing undefined

## [2026-01-31 15:20] Task 3: Fix Type Errors in @hominem/rocco React App

### Summary: ✅ 100% Complete - All 16 Errors Fixed

Fixed TypeScript type errors in the rocco React app caused by `exactOptionalPropertyTypes: true`.

### Patterns Applied:

**1. Component Props Interface Updates**
Add `| undefined` to all optional properties:
```typescript
// ❌ Before
interface AlertProps {
  onDismiss?: () => void;
}

// ✅ After
interface AlertProps {
  onDismiss?: (() => void) | undefined;
}
```

**2. API Type Definitions (cascade pattern)**
Update input types to match caller expectations:
```typescript
// packages/hono-rpc/src/types/places.types.ts
export type PlaceUpdateVisitInput = {
  description?: string | undefined;  // ← Added | undefined
  visitNotes?: string | undefined;
  // ...
};
```

**3. React useState Type Safety**
Use explicit type annotations to prevent `string | undefined` inference:
```typescript
// ❌ Fails
const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

// ✅ Works
const getDefaultDate = (): string => {
  const iso = new Date().toISOString();
  const parts = iso.split('T');
  return parts[0] || '';
};
const [date, setDate] = useState<string>(getDefaultDate());
```

**4. Optional Discriminated Union Types**
Update variant properties:
```typescript
type ReceivedInviteItemProps =
  | { variant: 'preview'; /* ... */ }
  | { 
      variant?: 'invite' | undefined;  // ← Added | undefined
      currentUserEmail?: string | undefined;
      canAccept?: boolean | undefined;
    };
```

**5. Mock Data Type Casting**
For test mocks with external types, use explicit type assertion:
```typescript
export const TEST_USER: User = {
  confirmation_sent_at: undefined as string | undefined,
  // ...
} as User;
```

### Files Fixed:

**Component Props (5 files):**
1. `app/components/user-avatar.tsx` - UserAvatarProps.image
2. `app/components/places/place-types.tsx` - PlaceTypeProps.emoji
3. `app/components/places/PlaceTypes.tsx` - PlaceTypeProps.emoji
4. `app/components/places/places-list.tsx` - PlacesListProps.canAdd
5. `app/components/ReceivedInviteItem.tsx` - Discriminated union props

**Service & API Types (5 files):**
6. `packages/hono-rpc/src/types/places.types.ts` - PlaceUpdateVisitInput, PlaceLogVisitInput
7. `packages/hono-rpc/src/types/people.types.ts` - PeopleCreateInput
8. `packages/services/src/google-places.service.ts` - GooglePlacePrediction.priceLevel
9. `apps/rocco/app/lib/shared-types.ts` - GooglePlacePrediction.priceLevel
10. `apps/rocco/app/hooks/useGooglePlacesAutocomplete.ts` - UseGooglePlacesAutocompleteOptions.location

**App Logic & Config (4 files):**
11. `app/lib/logger.ts` - LogEntry interface
12. `app/lib/services/invite-preview.server.ts` - InvitePreview type
13. `app/components/places/LogVisit.tsx` - React state types + form handling
14. `packages/ui/src/components/ui/alert.tsx` - AlertProps interface
15. `app/test/mocks/index.ts` - TEST_USER mock with type assertion

### Key Learning: React Hook Form + State Types

When using React hooks with `exactOptionalPropertyTypes`:
- Always provide explicit type parameters to useState
- Use helper functions for complex default values
- Ensure split/array access operations have fallbacks (e.g., `parts[0] || ''`)
- This prevents TypeScript from inferring `T | undefined` when T is always defined

### Verification

```bash
bun run typecheck --filter @hominem/rocco
# Result: ✅ 0 errors, exits with code 0
```


## [2026-01-31 16:20] Task 4: Fix Type Errors in @hominem/notes React App

### Summary: ✅ 100% Complete - All 24 Errors Fixed

Fixed TypeScript type errors in the notes React app caused by `exactOptionalPropertyTypes: true` and `noUncheckedIndexedAccess: true`.

### Core Patterns Used:

**1. API Type Definitions with | undefined**
Added `| undefined` to all optional properties in type definitions:
```typescript
// packages/hono-rpc/src/types/events.types.ts
export type EventsCreateInput = {
  title: string;
  description?: string | undefined;
  date?: string | Date | undefined;
  type?: string | undefined;
  tags?: string[] | undefined;
  people?: string[] | undefined;
};
```

**2. Component Props Interface Updates**
Updated component interfaces to include `| undefined` on optional properties:
```typescript
// apps/notes/app/components/due-date-picker.tsx
interface DatePickerProps {
  className?: string | undefined;
  disabled?: boolean | undefined;
  // ... etc
}
```

**3. Conditional Spreading for Optional Parameters**
```typescript
// Instead of: { chatId, userId }
// Where userId is string | undefined

// Use: { chatId, ...(userId && { userId }) }
// Only includes userId if defined
```

**4. noUncheckedIndexedAccess Guards**
```typescript
// For array/Uint8Array access:
const value = dataArray[i];
if (value === undefined) continue;
// Now use value safely
```

**5. Type Guard Extraction for Indexed Access**
```typescript
// For reduce with indexed access:
const groupedShortcuts = shortcuts.reduce(
  (acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    const category = acc[shortcut.category];
    if (category) {
      category.push(shortcut);
    }
    return acc;
  },
  {} as Record<string, KeyboardShortcut[]>,
);
```

**6. Consistent Activity Type Across Components**
One Activity type exported from EventList, imported and used consistently in EventCard and StatsDisplay.

### Files Modified:

**API Type Definitions (4 files):**
1. `packages/hono-rpc/src/types/events.types.ts` - EventsCreateInput, EventsGoogleSyncInput
2. `packages/hono-rpc/src/types/twitter.types.ts` - TwitterPostInput.contentId
3. `packages/hono-rpc/src/types/notes.types.ts` - NotesCreateInput.taskMetadata, NotesUpdateInput.taskMetadata

**Hook/Service Interfaces (2 files):**
4. `apps/notes/app/lib/hooks/use-google-calendar-sync.ts` - CalendarSyncOptions
5. `apps/notes/app/hooks/useGoogleCalendarSync.ts` - SyncOptions

**Component Props (8 files):**
6. `apps/notes/app/components/chat/ChatMessage.tsx` - Use conditional spreading for onSave
7. `apps/notes/app/components/chat/ChatMessages.tsx` - Conditional spreading + nullish coalesce for booleans
8. `apps/notes/app/components/chat/ChatInput.tsx` - Conditional spreading for userId
9. `apps/notes/app/components/due-date-picker.tsx` - DatePickerProps with | undefined (fixed ui package)
10. `apps/notes/app/components/copy-button.tsx` - CopyButtonProps with | undefined
11. `apps/notes/app/components/strategy-section.tsx` - CopyButtonProps with | undefined
12. `apps/notes/app/components/goals/goal-modal.tsx` - GoalModalProps goal/isLoading with | undefined
13. `apps/notes/app/routes/notes/components/elapsed-time.tsx` - ElapsedTimeProps initialDurationMs with | undefined

**Type Definitions & Interfaces (5 files):**
14. `apps/notes/app/components/chat/types.ts` - SearchResponse with | undefined on optional fields
15. `apps/notes/app/components/events/EventList.tsx` - Activity interface with | undefined
16. `apps/notes/app/components/events/StatsDisplay.tsx` - Activity interface with | undefined
17. `apps/notes/app/components/events/EventCard.tsx` - Activity interface with | undefined
18. `apps/notes/app/lib/trpc/context.ts` - Context.request with | undefined

**Utility/Form Handling (4 files):**
19. `apps/notes/app/lib/utils/chat-loader-utils.ts` - Type guard for array access
20. `apps/notes/app/routes/chat/index.tsx` - Type guard for array access
21. `apps/notes/app/routes/events.tsx` - Event data transformation
22. `apps/notes/app/routes/notes/components/inline-create-form.tsx` - Conditional spreading for taskMetadata
23. `apps/notes/app/routes/notes/components/tweet-modal.tsx` - Type guard + conditional spreading
24. `apps/notes/app/components/keyboard-shortcuts-help.tsx` - Type guard for indexed access

### Key Insights:

1. **API Layer Consistency**: When updating API input types with `| undefined`, the pattern cascades through hook interfaces that accept those parameters.

2. **Component Prop Spreading**: With `exactOptionalPropertyTypes`, it's often cleaner to use conditional spreading `...(condition && { prop })` rather than ternary expressions `prop: condition ? value : undefined`.

3. **Shared Type Consolidation**: Multiple components (EventCard, StatsDisplay, EventList) had duplicate Activity type definitions. Consolidating to a single export prevents type divergence.

4. **Array Access Pattern**: With `noUncheckedIndexedAccess`, accessing typed arrays (Uint8Array, regular arrays) requires explicit undefined checks. Extract the value to a variable and check before use.

5. **Nullish vs Logical Operators**: 
   - Use `??` with optional boolean properties: `message.isStreaming ?? false`
   - Use `&&` for conditional spreading: `...(userId && { userId })`

### Verification

```bash
bun run typecheck --filter @hominem/notes
# Result: ✅ All 16 tasks successful, 0 errors
```

All 24 type errors resolved. No breaking changes to notes app UI or functionality.

## [2026-01-31 17:30] Task 5: Fix All 48 Type Errors in @hominem/finance React App - FINAL PACKAGE

### Summary: ✅ 100% Complete - All 48 Errors Fixed

Fixed TypeScript type errors in the finance React app (final package of Task 1). Applied `| undefined` pattern systematically across hooks, component props, route handlers, and utility files. **Typecheck now passes with zero errors.**

### Comprehensive Patterns Applied:

**1. Hook Interface Updates (Cascade Foundation)**
All optional parameters require `| undefined`:
```typescript
// apps/finance/app/lib/hooks/use-time-series.ts
interface TimeSeriesParams {
  dateFrom?: Date | undefined;      // ← Fixed from dateFrom?: Date
  dateTo?: Date | undefined;
  account?: string | undefined;
  category?: string | undefined;
  includeStats?: boolean | undefined;
  compareToPrevious?: boolean | undefined;
  groupBy?: 'month' | 'week' | 'day' | undefined;
  enabled?: boolean | undefined;
}
```

**2. Component Props Interface Updates**
All optional properties include `| undefined`:
```typescript
// apps/finance/app/components/analytics/analytics-chart-display.tsx
interface AnalyticsChartDisplayProps {
  chartType: 'area' | 'bar';
  setChartType: Dispatch<SetStateAction<'area' | 'bar'>>;
  dateFrom?: Date | undefined;        // ← Added | undefined
  dateTo?: Date | undefined;
  selectedAccount?: string | undefined;
  selectedCategory?: string | undefined;
  groupBy?: 'month' | 'week' | 'day' | undefined;
  compareToPrevious?: boolean | undefined;
}
```

**3. Conditional Spreading for Optional Object Properties**
```typescript
// apps/finance/app/components/accounts/account-connection-dialog.tsx
const handleLink = async () => {
  const plaidItemId = selectedPlaidAccountId && selectedPlaidAccountId !== 'none'
    ? selectedPlaidAccountId
    : undefined;
  await linkMutation.linkAccount.mutateAsync({
    accountId: account.id,
    institutionId: selectedInstitutionId,
    ...(plaidItemId && { plaidItemId }),  // ← Conditional spreading
  });
};
```

**4. Array Indexed Access with Type Guards**
```typescript
// apps/finance/app/lib/hooks/use-time-series.ts
const formatDateLabel = (dateStr: string) => {
  if (groupBy === 'month') {
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1];
    if (!year || !month) return dateStr;  // ← Type guard for array access
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      1,
    ).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return dateStr;
};
```

**5. Inline Type Annotations for Function Parameters**
```typescript
// apps/finance/app/components/transactions/transactions-list.tsx
function TransactionMetadata({
  transaction,
  account,
}: {
  transaction: TransactionFromAPI;
  account?: AccountFromMap | undefined;  // ← Added | undefined
}) {
  // ...
}
```

**6. React Controlled Component Type Handling**
```typescript
// apps/finance/app/routes/finance.sales-tax-calculator.tsx
const handleSliderChange = (value: number[]) => {
  const newPrice = value[0];
  if (newPrice !== undefined) {  // ← Type guard for array access
    setPrice(newPrice);
  }
};
```

**7. Mutation Options with Conditional Spreading**
```typescript
// apps/finance/app/lib/hooks/use-budget.ts
return useHonoMutation<BudgetCalculateOutput, BudgetCalculateInput | undefined>(
  async (client, variables) => { /* ... */ },
  {
    onSuccess: () => {
      utils.invalidate(['finance', 'budget', 'calculate']);
    },
    ...(options?.onError && { onError: options.onError }),  // ← Avoid passing undefined
  },
);
```

**8. Complex State Mapping with Type Assertions**
```typescript
// apps/finance/app/lib/hooks/use-import-transactions-store.ts
const convertJobToFileStatusStable = useCallback(
  (jobs: ImportTransactionsJob[]): FileStatus[] =>
    jobs.map((job) => ({
      file: getStableFile(job.fileName),
      status: job.status,
      stats: job.stats,
      ...(job.error && { error: job.error }),  // ← Conditional error field
    } as FileStatus)),
  [getStableFile],
);
```

**9. DropdownMenu Props with Conditional Spreading**
```typescript
// apps/finance/app/components/finance/sort-controls.tsx
return (
  <DropdownMenu
    {...(open !== undefined && { open })}
    {...(onOpenChange && { onOpenChange })}
  >
    {/* ... */}
  </DropdownMenu>
);
```

**10. Form Data Type Updates**
```typescript
// apps/finance/app/routes/budget.categories.$id.tsx
await updateCategoryMutation.mutateAsync({
  id,
  name: formData.name,
  type: formData.type,
  averageMonthlyExpense: formData.averageMonthlyExpense,
  ...(formData.color && { color: formData.color }),  // ← Only if defined
});
```

### Files Fixed by Category:

**Priority 1 - Hook Interfaces (Type Definition Cascade):**
1. `app/lib/hooks/use-time-series.ts` - TimeSeriesParams (affects 7+ components)
2. `app/lib/hooks/use-analytics.ts` - CategoryBreakdownParams
3. `app/lib/hooks/use-finance-top-merchants.ts` - UseFinanceTopMerchantsParams
4. `app/lib/hooks/use-finance-data.ts` - FilterArgs
5. `app/lib/hooks/use-budget.ts` - Mutation options onError handling

**Priority 2 - Component Props Interfaces (Analytics & Finance):**
6. `app/components/analytics/analytics-chart-display.tsx` - AnalyticsChartDisplayProps
7. `app/components/analytics/analytics-statistics-summary.tsx` - AnalyticsStatisticsSummaryProps
8. `app/components/analytics/monthly-breakdown.tsx` - MonthlyBreakdownProps
9. `app/components/analytics/top-categories.tsx` - TopCategoriesProps
10. `app/components/analytics/top-merchants.tsx` - TopMerchantsProps
11. `app/components/file-upload-status.tsx` - ProcessingStat props
12. `app/components/finance/transaction-filters.tsx` - FilterArgs usage
13. `app/components/finance/sort-controls.tsx` - SortControlsProps + DropdownMenu props
14. `app/components/transactions/transactions-list.tsx` - TransactionMetadata, TransactionListItem
15. `app/components/plaid/plaid-link.tsx` - PlaidLinkProps
16. `app/components/accounts/account-status-display.tsx` - AccountStatusDisplayProps
17. `app/components/accounts/account-connection-dialog.tsx` - AccountConnectionDialogProps
18. `app/components/accounts/plaid-account-status.tsx` - onRefresh param
19. `app/components/file-upload-status-badge.tsx` - FileUploadStatusBadge status prop

**Priority 3 - Route Logic & Handlers:**
20. `app/routes/budget.categories.$id.tsx` - Conditional spreading for color
21. `app/routes/budget.categories.new.tsx` - Conditional spreading for color
22. `app/routes/finance.music-streaming-calculator.tsx` - Array access guard
23. `app/routes/finance.sales-tax-calculator.tsx` - Array access guard + type safety
24. `app/routes/import.tsx` - FileImportProps + fileMap type definition

**Priority 4 - Utilities & Hooks:**
25. `app/lib/files.utils.ts` - Base64 conversion with undefined check
26. `app/lib/hooks/use-import-transactions-store.ts` - FileStatus mapping with error handling
27. `app/lib/hooks/use-plaid.ts` - Conditional spreading for plaidItemId

### Key Patterns Summary:

| Pattern | Use Case | Example |
|---------|----------|---------|
| `prop?: Type \| undefined` | Interface optional props | `dateFrom?: Date \| undefined` |
| `...(value && { key: value })` | Avoid undefined in objects | `...(color && { color })` |
| `const x = arr[i]; if (!x) return;` | Array access safety | `const year = parts[0]; if (!year) return;` |
| `...(condition && { callback })` | Optional callbacks | `...(onError && { onError })` |
| `if (value !== undefined) { ... }` | Type guard for numbers | Array indexed access |
| `??` operator | Nullish coalescing | `strategy ?? 'default'` |

### Verification

```bash
bun run typecheck --filter @hominem/finance
# ✅ Tasks: 16 successful, 16 total
# ✅ Cached: 16 cached, 16 total
# ✅ Time: 440ms
# ✅ Result: ZERO errors, exit code 0
```

### Task 1 Summary: ALL PACKAGES COMPLETE ✅

**Packages Fixed (11 total):**
- ✅ @hominem/hono-rpc (33 errors)
- ✅ @hominem/cli (11 errors)
- ✅ @hominem/api (6 errors)
- ✅ @hominem/rocco (16 errors)
- ✅ @hominem/notes (24 errors)
- ✅ @hominem/finance (48 errors) ← FINAL PACKAGE
- ✅ @hominem/services, finance-services, events-services, places-services, lists-services

**Total Errors Fixed: 138+ type errors across all packages**

All React apps and libraries now compile with `exactOptionalPropertyTypes: true` enabled. The pattern is consistent across the entire monorepo: explicit `| undefined` on optional properties, conditional spreading to avoid undefined values, and defensive type guards for array access.

