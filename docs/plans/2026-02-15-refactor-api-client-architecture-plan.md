---
title: Refactor API client architecture - rename hono to api and add server-side loading
type: refactor
date: 2026-02-15
---

# Refactor API Client Architecture

## Overview

Rename `lib/hono/` to `lib/api/` across all apps and flatten the server client to `lib/api.server.ts`. Also add server-side loaders to finance routes that currently rely entirely on client-side data fetching.

## Problem Statement

1. **Naming inconsistency**: The term "hono" is used in directory names, exposing implementation details that may change
2. **No server loading in finance**: All finance routes fetch data client-side, causing unnecessary loading states on initial render
3. **Inconsistent architecture**: Each app has slightly different patterns for API interactions

## Proposed Solution

### Phase 1: Directory Rename (All Apps)

Rename directories and move files to flatten structure:

| App | Old | New |
|-----|-----|-----|
| rocco | `lib/hono/` | `lib/api/` |
| rocco | `lib/rpc/server.ts` | `lib/api.server.ts` |
| notes | `lib/hono/` | `lib/api/` |
| notes | `lib/rpc/server.ts` | `lib/api.server.ts` |
| finance | `lib/hono/` | `lib/api/` |

### Phase 2: Clean Up Notes

Delete redundant files in notes:
- `lib/rpc/provider.tsx` - redundant wrapper around `lib/api/provider.tsx`
- `lib/rpc/client.ts` - unused (hooks import from `lib/api/`)
- `lib/rpc/index.ts` - re-export file
- Delete `lib/rpc/` directory

### Phase 3: Add Server Loading to Finance

Add loaders to finance routes that fetch data. Each route will:
1. Import `createServerHonoClient` from `~/lib/api.server`
2. Add `requireAuth` for authentication
3. Fetch data server-side in loader
4. Return data via loader
5. Optionally use `initialData` in hooks for instant renders

**Routes needing loaders:**

| Route | Data to Fetch |
|-------|---------------|
| `routes/finance.tsx` | accounts, transactions |
| `routes/accounts.tsx` | all accounts |
| `routes/accounts.$id.tsx` | account + transactions |
| `routes/analytics.tsx` | analytics data |
| `routes/analytics.monthly.$month.tsx` | monthly stats |
| `routes/analytics.category.$category.tsx` | category breakdown |
| `routes/analytics.categories.tsx` | category data |
| `routes/budget.tsx` | budget categories |
| `routes/budget.categories.$id.tsx` | budget category |
| `routes/budget.categories.setup.tsx` | setup categories |
| `routes/finance.runway.tsx` | runway calculation |

### Phase 4: Update All Imports

Update all files that import from old paths:

**Old → New:**
- `~/lib/hono/*` → `~/lib/api/*`
- `~/lib/rpc/server` → `~/lib/api.server`

## Technical Approach

### Server Client Pattern

```typescript
// lib/api.server.ts
import { createHonoClient } from '@hominem/hono-rpc/client';

export function createServerHonoClient(
  accessToken?: string,
  request?: Request,
) {
  const baseUrl = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  const cookieHeader = request?.headers.get('Cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  return createHonoClient(baseUrl, { headers });
}
```

### Loader Pattern (Finance)

```typescript
// routes/finance.tsx
import { createServerHonoClient } from '~/lib/api.server';
import { requireAuth } from '~/lib/guards';

export async function loader({ request }: Route.LoaderArgs) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const client = createServerHonoClient(authResult.session?.access_token, request);

  const [accountsRes, transactionsRes] = await Promise.all([
    client.api.finance.accounts.list.$post({ json: {} }),
    client.api.finance.transactions.list.$post({ json: { limit: 25 } }),
  ]);

  return {
    accounts: accountsRes.ok ? await accountsRes.json() : [],
    transactions: transactionsRes.ok ? await transactionsRes.json() : [],
  };
}

export default function FinancePage({ loaderData }: Route.ComponentProps) {
  const { accounts, transactions } = loaderData;

  const { accountsMap } = useFinanceAccounts({
    initialData: accounts,
  });
  // ...
}
```

## Alternative Approaches Considered

1. **Keep current structure**: Not acceptable - need consistent naming
2. **Use different term than "api"**: Could use "client" or "rpc" but "api" is most descriptive
3. **Add loaders incrementally**: Better to do all at once for consistency

## Acceptance Criteria

### Functional Requirements

- [ ] All 3 apps renamed: `lib/hono/` → `lib/api/`
- [ ] Server client flattened: `lib/api.server.ts` in all apps
- [ ] Finance has loaders on all data-fetching routes
- [ ] All imports updated to new paths
- [ ] No redundant files in notes (`lib/rpc/` deleted)

### Non-Functional Requirements

- [ ] TypeScript compiles without errors
- [ ] No console errors on page load
- [ ] Data loads on server (check network tab - no API calls to fetch initial data)

## Success Metrics

- All apps follow same directory structure
- Finance initial page load shows data without loading spinner
- No mention of "hono" in app code

## Dependencies & Risks

**Dependencies:**
- None - all changes are refactors

**Risks:**
- Import path changes could break builds if missed
- Finance loaders need auth guard (must match rocco/notes pattern)

## Files to Update

### rocco (~15 files)
- `lib/hono/` → `lib/api/`
- `lib/rpc/server.ts` → `lib/api.server.ts`
- Update imports in routes using server client

### notes (~20 files)
- `lib/hono/` → `lib/api/`
- Delete `lib/rpc/` contents
- Update all imports

### finance (~15 files + new)
- `lib/hono/` → `lib/api/`
- Create `lib/api.server.ts`
- Add loaders to ~11 routes
- Update all hook imports

## References

- Rocco loader example: `apps/rocco/app/routes/lists.$id.tsx:23-46`
- Notes loader example: `apps/notes/app/routes/workspace.tsx:24`
- Server client: `apps/rocco/app/lib/rpc/server.ts`
