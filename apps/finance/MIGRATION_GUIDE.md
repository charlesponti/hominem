# Hono RPC Migration Guide

## Using the Transformation Layer

The Hono client includes automatic date transformation. Use `transformResponse()` in your query functions to convert JSON date strings to Date objects.

### Pattern

```typescript
import { useHonoQuery, transformResponse } from '~/lib/hono';

// ✅ Correct - uses transformResponse for automatic date conversion
export const useFinanceAccounts = () =>
  useHonoQuery(['finance', 'accounts', 'list'], async (client) => {
    const res = await client.api.finance.accounts.list.$post({
      json: { includeInactive: false },
    });
    return transformResponse(res); // Automatically converts date strings to Date objects
  });

// ❌ Incorrect - dates will be strings
export const useFinanceAccounts = () =>
  useHonoQuery(['finance', 'accounts', 'list'], async (client) => {
    const res = await client.api.finance.accounts.list.$post({
      json: { includeInactive: false },
    });
    return res.json(); // Returns raw JSON with date strings
  });
```

### Type Inference

Types are automatically inferred from the RPC endpoints. No need for manual type definitions:

```typescript
// TypeScript will infer the return type from the RPC endpoint
const { data } = useFinanceAccounts();
// data is typed automatically with Date objects for date fields
```

### Benefits

1. **Automatic Type Safety**: Types come directly from the RPC definition
2. **Date Conversion**: Date strings automatically converted to Date objects
3. **No Manual Types**: No need to manually define response types
4. **Code Changes Tracked**: When RPC types change, TypeScript catches mismatches

### Migration Checklist

For each hook:

1. Replace `res.json()` with `transformResponse(res)`
2. Remove manual type annotations (let TypeScript infer from RPC)
3. Update components to expect Date objects instead of strings
