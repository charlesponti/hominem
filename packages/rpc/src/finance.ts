// ============================================================================
// Finance — Schemas, Types & Client
// ============================================================================

import type { HonoClient } from './core/api-client';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type InstitutionData = {
  id: string;
  name: string;
  logo?: string;
};

export type BudgetCategoryData = {
  id: string;
  name: string;
  userId: string;
  type?: 'income' | 'expense';
  color?: string;
  averageMonthlyExpense?: string;
};

export type AccountData = {
  id: string;
  userId: string;
  name: string;
  accountType: string;
  currentBalance: number | null;
};

export type TransactionData = {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string | null;
  postedOn: string;
  merchantName: string | null;
};

export type AccountWithPlaidInfo = AccountData & {
  institutionName?: string | null;
  plaidAccountId?: string | null;
  plaidItemId?: string | null;
};

export type TimeSeriesTrend = {
  raw: string;
  formatted: string;
  direction: 'up' | 'down' | 'flat';
  percentChange?: string;
  previousAmount?: number;
  formattedPreviousAmount?: string;
  percentChangeExpenses?: string;
  rawExpenses?: string;
  previousExpenses?: number;
  formattedPreviousExpenses?: string;
  directionExpenses?: 'up' | 'down';
};

export type TimeSeriesDataPoint = {
  date: string;
  amount: number;
  expenses: number;
  income: number;
  count: number;
  average: number;
  trend?: TimeSeriesTrend;
  formattedAmount?: string;
  formattedIncome?: string;
  formattedExpenses?: string;
};

export type TimeSeriesStats = {
  total: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  periodCovered?: string;
  totalIncome?: number;
  totalExpenses?: number;
  averageIncome?: number;
  averageExpenses?: number;
  count?: number;
};

export type PlaidConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  status: 'active' | 'error' | 'disconnected';
  lastSynced: string;
  accounts: number;
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export type AccountWithTransactions = AccountWithPlaidInfo & {
  transactions: TransactionData[];
};

export type AccountsAllData = {
  accounts: AccountWithTransactions[];
  connections: PlaidConnection[];
};

export type AccountListOutput = AccountData[];
export type AccountGetOutput = AccountWithTransactions;
export type AccountCreateOutput = AccountData;
export type AccountUpdateOutput = AccountData;
export type AccountDeleteOutput = { success: true };
export type AccountAllOutput = AccountsAllData;
export type AccountsWithPlaidOutput = AccountWithPlaidInfo[];
export type AccountConnectionsOutput = PlaidConnection[];
export type AccountInstitutionAccountsOutput = AccountWithPlaidInfo[];

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionUpdateData = {
  accountId?: string;
  amount?: string | number;
  description?: string | null;
  category?: string | null;
  date?: string;
  merchantName?: string | null;
  note?: string | null;
  tags?: string | null;
  excluded?: boolean | null;
  recurring?: boolean | null;
};

export type TransactionListOutput = {
  data: TransactionData[];
  filteredCount: number;
  totalUserCount: number;
};

export type TransactionCreateOutput = TransactionData;
export type TransactionUpdateOutput = TransactionData;
export type TransactionDeleteOutput = { success: boolean; message?: string };

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

export type InstitutionsListOutput = InstitutionData[];

export type InstitutionCreateOutput = InstitutionData;

// ---------------------------------------------------------------------------
// Categories / Tags
// ---------------------------------------------------------------------------

export type CategoriesListItem = {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
};

export type CategoriesListOutput = CategoriesListItem[];

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type Merchant = {
  name: string;
  totalSpent: number;
  transactionCount: number;
};

export type TagBreakdownItem = {
  tag: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

export type TransactionStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
};

export type TagSpendingItem = {
  name: string | null;
  amount: number;
};

export type SpendingTimeSeriesOutput = {
  data: TimeSeriesDataPoint[];
  stats?: TimeSeriesStats | null;
};

export type TopMerchantsOutput = {
  merchants: Merchant[];
};

export type TagBreakdownOutput = {
  breakdown: TagBreakdownItem[];
  totalSpending: number;
  averagePerDay: number;
};

export type MonthlyStatsOutput = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  averageTransaction: number;
  topTag: string;
  topMerchant: string;
  formattedIncome: string;
  formattedExpenses: string;
  formattedNet: string;
  formattedAverage: string;
  totalIncome?: number;
  totalExpenses?: number;
  netIncome?: number;
  tagSpending?: TagSpendingItem[];
  startDate?: string;
  endDate?: string;
};

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export type BudgetCategoryWithSpending = BudgetCategoryData & {
  actualSpending: number;
  percentageSpent: number;
  budgetAmount: number;
  allocationPercentage: number;
  variance: number;
  remaining: number;
  color: string;
  status: 'on-track' | 'warning' | 'over-budget';
  statusColor: string;
};

export type BudgetTrackingCategory = {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  actualSpending?: number;
  percentageSpent?: number;
  budgetAmount?: number;
  allocationPercentage?: number;
  variance?: number;
  status?: 'on-track' | 'warning' | 'over-budget';
  statusColor?: string;
  color?: string;
};

export type BudgetChartDataPoint = {
  month: string;
  budgeted: number;
  actual: number;
};

export type BudgetPieDataPoint = {
  name: string;
  value: number;
};

export type BudgetHistoryDataPoint = {
  date: string;
  budgeted: number;
  actual: number;
};

export type BudgetCategoryAllocation = {
  category: string;
  amount: number;
  percentage: number;
};

export type BudgetProjection = {
  month: number;
  savings: number;
  totalSaved: number;
};

export type BudgetCategoryInput = {
  name: string;
  type: 'income' | 'expense';
  amount?: number;
  averageMonthlyExpense?: string;
  color?: string;
};

export type TransactionCategoryAnalysis = {
  category: string;
  name?: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  type?: 'income' | 'expense';
  suggested?: boolean;
  suggestedBudget?: number;
  monthsWithTransactions?: number;
};

export type BudgetCategoriesListOutput = BudgetCategoryData[];

export type BudgetHistoryOutput = BudgetHistoryDataPoint[];

export type BudgetCalculateInput = {
  income: number;
  savingsGoal: number;
  allocations?: Record<string, number>;
  expenses?: Array<{
    category: string;
    amount: number;
  }>;
};

export type BudgetCalculateOutput = {
  totalBudget: number;
  disposable?: number;
  suggestedAllocations?: Record<string, number>;
  income?: number;
  totalExpenses?: number;
  surplus?: number;
  savingsRate?: number;
  categories?: BudgetCategoryAllocation[];
  projections?: BudgetProjection[];
  calculatedAt?: string;
  source?: 'manual' | 'categories';
};

export type TransactionCategoryAnalysisOutput = TransactionCategoryAnalysis[];

// ---------------------------------------------------------------------------
// Plaid
// ---------------------------------------------------------------------------

export type PlaidCreateLinkTokenOutput = {
  linkToken: string;
  expiration: string;
  requestId: string;
};

export type PlaidExchangeTokenOutput = {
  accessToken: string;
  itemId: string;
  requestId: string;
};

export type PlaidSyncItemOutput = {
  success: boolean;
  added: number;
  modified: number;
  removed: number;
};

export type PlaidRemoveConnectionOutput = {
  success: boolean;
};

// ---------------------------------------------------------------------------
// Runway
// ---------------------------------------------------------------------------

export type RunwayCalculateInput = {
  balance: number;
  monthlyExpenses: number;
  plannedPurchases?: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  projectionMonths?: number;
};

export type RunwayCalculateOutput = {
  runwayMonths: number;
  runwayEndDate: string;
  isRunwayDangerous: boolean;
  totalPlannedExpenses: number;
  projectionData: Array<{
    month: string;
    balance: number;
  }>;
  months: number;
  years: number;
};

// ---------------------------------------------------------------------------
// Affordability
// ---------------------------------------------------------------------------

export type AffordabilityCheckInput = {
  purchaseAmount: number;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  emergencyFundTarget?: number;
};

export type AffordabilityVerdict = 'affordable' | 'caution' | 'not-affordable';

export type AffordabilityCheckOutput = {
  verdict: AffordabilityVerdict;
  balanceAfterPurchase: number;
  monthlySurplus: number;
  monthsOfRunwayAfterPurchase: number;
  percentOfMonthlyIncome: number;
  emergencyFundTarget: number;
  emergencyFundShortfall: number;
  reasons: string[];
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export type FinanceClient = HonoClient['api']['finance'];
