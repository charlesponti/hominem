# tRPC Implementation in Florin

This document explains how tRPC has been implemented in the Florin app, following the same pattern as the Notes app.

## Overview

We've successfully migrated the finance API routes from direct REST endpoints to tRPC, providing type-safe, end-to-end communication between the client and server.

## Architecture

### Server Side (API App)

The tRPC server is defined in `apps/api/src/trpc/routers/finance.ts` and includes:

- **Accounts**: CRUD operations for financial accounts
- **Transactions**: CRUD operations for financial transactions  
- **Budget Categories**: CRUD operations for budget categories
- **Analytics**: Summary and reporting functionality

### Client Side (Florin App)

The tRPC client is configured in `apps/florin/app/lib/trpc.ts` and provides:

- Type-safe API calls
- Automatic caching and invalidation
- Optimistic updates
- Error handling

## Key Features

### 1. Type Safety
All API calls are fully typed, providing autocomplete and compile-time error checking.

### 2. Service Layer Integration
The tRPC routes use the existing finance services instead of direct database access:
- `FinancialAccountService` for account operations
- `finance.service.ts` functions for transactions and analytics

### 3. Authentication
Automatic token handling using Supabase authentication.

## Usage Examples

### Queries (Reading Data)

```typescript
// Fetch accounts
const { data: accounts, isLoading } = trpc.finance.accounts.list.useQuery({
  includeInactive: false,
})

// Fetch transactions with filters
const { data: transactions } = trpc.finance.transactions.list.useQuery({
  accountId: 'account-uuid',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  limit: 50,
  sortBy: 'date',
  sortOrder: 'desc',
})

// Fetch analytics summary
const { data: analytics } = trpc.finance.analytics.summary.useQuery({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
})
```

### Mutations (Writing Data)

```typescript
// Create a new transaction
const createTransaction = trpc.finance.transactions.create.useMutation({
  onSuccess: () => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  },
})

createTransaction.mutate({
  accountId: 'account-uuid',
  description: 'Grocery shopping',
  amount: '45.67',
  category: 'Food',
  date: '2024-01-15',
  type: 'expense',
})

// Update an account
const updateAccount = trpc.finance.accounts.update.useMutation()

updateAccount.mutate({
  id: 'account-uuid',
  name: 'Updated Account Name',
  balance: '1000.00',
})
```

### Real-time Updates

tRPC automatically handles cache invalidation and updates when mutations are successful:

```typescript
// This query will automatically refetch when a new transaction is created
const { data: transactions } = trpc.finance.transactions.list.useQuery()

// After creating a transaction, the list will update automatically
const createTransaction = trpc.finance.transactions.create.useMutation()
```

## Available Endpoints

### Accounts
- `trpc.finance.accounts.list` - List all accounts
- `trpc.finance.accounts.get` - Get a specific account
- `trpc.finance.accounts.create` - Create a new account
- `trpc.finance.accounts.update` - Update an account
- `trpc.finance.accounts.delete` - Delete an account

### Transactions
- `trpc.finance.transactions.list` - List transactions with filters
- `trpc.finance.transactions.get` - Get a specific transaction
- `trpc.finance.transactions.create` - Create a new transaction
- `trpc.finance.transactions.update` - Update a transaction
- `trpc.finance.transactions.delete` - Delete a transaction

### Budget Categories
- `trpc.finance.budgetCategories.list` - List budget categories
- `trpc.finance.budgetCategories.create` - Create a new category
- `trpc.finance.budgetCategories.update` - Update a category
- `trpc.finance.budgetCategories.delete` - Delete a category

### Analytics
- `trpc.finance.analytics.summary` - Get financial summary with top categories

## Testing

You can test the implementation by:

1. Starting the API server: `cd apps/api && npm run dev`
2. Starting the Florin app: `cd apps/florin && npm run dev`
3. Navigating to `/dashboard` to see the tRPC-powered finance dashboard

## Benefits Over REST

1. **Type Safety**: End-to-end type safety without code generation
2. **Developer Experience**: Better autocomplete and error messages
3. **Performance**: Automatic caching and optimistic updates
4. **Maintainability**: Single source of truth for API contracts
5. **Consistency**: Same patterns across the entire application

## Migration Notes

The existing REST endpoints in `apps/api/src/routes/finance/` are still available for backward compatibility. The tRPC implementation provides a modern, type-safe alternative that can be gradually adopted throughout the application. 
