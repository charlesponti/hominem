# @hominem/finance-react

React components and hooks for financial features.

## Exports

### Components
- `Accounts.*` - Account-related components (headers, charts, status displays)
- `Analytics.*` - Analytics components (charts, filters, summaries)
- `Finance.*` - Transaction and budget components (lists, filters, selectors)
- `Plaid.*` - Plaid integration components

### Hooks
- `useAnalytics` - Analytics data fetching
- `useBudget` - Budget management
- `useFinanceData` - Core finance data fetching
- `useInstitutions` - Institution data fetching
- `useMonthlyStats` - Monthly statistics
- `usePlaid` - Plaid integration
- `useRunway` - Runway calculation
- `useSelectedAccount` - Account selection state
- `useTimeSeries` - Time series data

### Stores
- `useImportTransactionsStore` - Transaction import state

## Dependencies

- `@hominem/ui` - UI primitives
- `@hominem/finance-services` - Backend services
- `@hominem/rpc` - API client
- `@hominem/rpc/types/*` - RPC types
- `@tanstack/react-query` - Data fetching
- `react-plaid-link` - Plaid integration
- `recharts` - Charts
- `zustand` - State management
