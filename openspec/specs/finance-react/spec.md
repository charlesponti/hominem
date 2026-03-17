## ADDED Requirements

### Requirement: Package Structure
The finance-react package SHALL provide a well-organized directory structure for financial React components and hooks.

#### Scenario: Import structure
- **WHEN** a consumer imports from `@hominem/finance-react`
- **THEN** they SHALL be able to import individual components: `import { AccountList } from '@hominem/finance-react'`
- **AND** they SHALL be able to import via namespaces: `import { Accounts } from '@hominem/finance-react'` and use `Accounts.List`

### Requirement: Component Exports
The finance-react package SHALL export all financial domain components that were previously in apps/finance.

#### Scenario: Account components export
- **WHEN** importing account-related components
- **THEN** the following SHALL be available: AccountHeader, AccountSpendingChart, AccountStatusDisplay, AccountConnectionDialog, PlaidAccountStatus, ManualInstitutionStatus, NotConnectedStatus, PlaidStatusBadge

#### Scenario: Analytics components export
- **WHEN** importing analytics-related components
- **THEN** the following SHALL be available: AnalyticsChartDisplay, AnalyticsFilters, AnalyticsStatisticsSummary, MonthlyBreakdown, TopMerchants, TopTags

#### Scenario: Finance components export
- **WHEN** importing finance/transaction components
- **THEN** the following SHALL be available: BudgetOverview, CategorySelect, AccountSelect, DateMonthSelect, GroupBySelect, TransactionFilters, PaginationControls, SortControls, SortRow, TransactionsList, ExportTransactions

#### Scenario: Plaid integration export
- **WHEN** importing Plaid-related components
- **THEN** PlaidLink SHALL be available for Plaid Link integration

### Requirement: Hooks Exports
The finance-react package SHALL export all financial domain hooks for data fetching and state management.

#### Scenario: Data fetching hooks
- **WHEN** importing data fetching hooks
- **THEN** the following SHALL be available: useAnalytics, useBudget, useFinanceData, useFinanceTopMerchants, useInstitutions, useMonthlyStats, usePlaidAccountsByInstitution, useTimeSeries

#### Scenario: State and utility hooks
- **WHEN** importing state management hooks
- **THEN** the following SHALL be available: useImportTransactionsStore, useRunway, useSelectedAccount

#### Scenario: Integration hooks
- **WHEN** importing integration hooks
- **THEN** usePlaid SHALL be available for Plaid SDK integration

### Requirement: Store Exports
The finance-react package SHALL export Zustand stores for financial state management.

#### Scenario: Store usage
- **WHEN** using stores in an application
- **THEN** the following stores SHALL be available: useImportTransactionsStore, useSelectedAccountStore (via hook), and route-loading utilities

### Requirement: Dependencies
The finance-react package SHALL declare appropriate peer and dev dependencies.

#### Scenario: Peer dependencies
- **WHEN** installing the package
- **THEN** it SHALL declare React, React DOM, and React Query as peer dependencies
- **AND** it SHALL depend on `@hominem/ui`, `@hominem/finance-services`, `@hominem/hono-client`, and `@hominem/hono-rpc`
- **AND** it SHALL depend on `react-plaid-link` and `recharts` as direct dependencies

### Requirement: Type Safety
The finance-react package SHALL maintain full TypeScript type safety.

#### Scenario: Type exports
- **WHEN** using the package
- **THEN** all component props, hook parameters, and return types SHALL be properly typed and exported
- **AND** no `any` types SHALL be used

### Requirement: Build Configuration
The finance-react package SHALL be buildable and publishable.

#### Scenario: Build output
- **WHEN** running the build command
- **THEN** it SHALL generate CommonJS and ESM outputs
- **AND** it SHALL generate TypeScript declaration files
- **AND** the package SHALL be usable in both CJS and ESM consuming applications
