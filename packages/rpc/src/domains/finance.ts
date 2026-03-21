import type { RawHonoClient } from '../core/raw-client'
import type {
  AccountAllOutput,
  AccountConnectionsOutput,
  AccountGetInput,
  AccountGetOutput,
  AccountInstitutionAccountsInput,
  AccountInstitutionAccountsOutput,
  AccountListInput,
  AccountListOutput,
  AccountsWithPlaidOutput,
  CategoriesListOutput,
  InstitutionCreateInput,
  InstitutionCreateOutput,
  InstitutionsListOutput,
  MonthlyStatsOutput,
  RunwayCalculateInput,
  RunwayCalculateOutput,
  SpendingTimeSeriesOutput,
  TagBreakdownOutput,
  TopMerchantsOutput,
  TransactionListOutput,
} from '../types/finance.types'

export interface FinanceMonthlyStatsInput {
  month: string
}

export interface FinanceTransactionsListInput {
  account?: string
  dateFrom?: string
  dateTo?: string
  description?: string
  limit?: number
  offset?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface FinanceTagBreakdownInput {
  account?: string
  from?: string
  to?: string
  tag?: string
  limit?: number
}

export interface FinanceSpendingTimeSeriesInput {
  account?: string
  compareToPrevious?: boolean
  from?: string
  groupBy?: 'month' | 'week' | 'day'
  includeStats?: boolean
  tag?: string
  to?: string
}

export interface FinanceTopMerchantsInput {
  account?: string
  from?: string
  limit?: number
  tag?: string
  to?: string
}

export interface FinanceClient {
  listAccounts(input: AccountListInput): Promise<AccountListOutput>
  listAllAccounts(): Promise<AccountAllOutput>
  getAccount(input: AccountGetInput): Promise<AccountGetOutput>
  listTransactions(input: FinanceTransactionsListInput): Promise<TransactionListOutput>
  listInstitutions(): Promise<InstitutionsListOutput>
  createInstitution(input: InstitutionCreateInput): Promise<InstitutionCreateOutput>
  listAccountsWithPlaid(): Promise<AccountsWithPlaidOutput>
  listConnections(): Promise<AccountConnectionsOutput>
  listInstitutionAccounts(
    input: AccountInstitutionAccountsInput,
  ): Promise<AccountInstitutionAccountsOutput>
  getTagBreakdown(input: FinanceTagBreakdownInput): Promise<TagBreakdownOutput>
  listTags(): Promise<CategoriesListOutput>
  getMonthlyStats(input: FinanceMonthlyStatsInput): Promise<MonthlyStatsOutput>
  getSpendingTimeSeries(input: FinanceSpendingTimeSeriesInput): Promise<SpendingTimeSeriesOutput>
  getTopMerchants(input: FinanceTopMerchantsInput): Promise<TopMerchantsOutput>
  calculateRunway(input: RunwayCalculateInput): Promise<RunwayCalculateOutput>
}

export function createFinanceClient(rawClient: RawHonoClient): FinanceClient {
  return {
    async listAccounts(input) {
      const res = await rawClient.api.finance.accounts.list.$post({ json: input })
      return res.json() as Promise<AccountListOutput>
    },
    async listAllAccounts() {
      const res = await rawClient.api.finance.accounts.all.$post({ json: {} })
      return res.json() as Promise<AccountAllOutput>
    },
    async getAccount(input) {
      const res = await rawClient.api.finance.accounts.get.$post({ json: input })
      return res.json() as Promise<AccountGetOutput>
    },
    async listTransactions(input) {
      const res = await rawClient.api.finance.transactions.list.$post({ json: input })
      return res.json() as Promise<TransactionListOutput>
    },
    async listInstitutions() {
      const res = await rawClient.api.finance.institutions.list.$post({ json: {} })
      return res.json() as Promise<InstitutionsListOutput>
    },
    async createInstitution(input) {
      const res = await rawClient.api.finance.institutions.create.$post({ json: input })
      return res.json() as Promise<InstitutionCreateOutput>
    },
    async listAccountsWithPlaid() {
      const res = await rawClient.api.finance.accounts['with-plaid'].$post({ json: {} })
      return res.json() as Promise<AccountsWithPlaidOutput>
    },
    async listConnections() {
      const res = await rawClient.api.finance.accounts.connections.$post({ json: {} })
      return res.json() as Promise<AccountConnectionsOutput>
    },
    async listInstitutionAccounts(input) {
      const res = await rawClient.api.finance.accounts['institution-accounts'].$post({ json: input })
      return res.json() as Promise<AccountInstitutionAccountsOutput>
    },
    async getTagBreakdown(input) {
      const res = await rawClient.api.finance.analyze['tag-breakdown'].$post({ json: input })
      return res.json() as Promise<TagBreakdownOutput>
    },
    async listTags() {
      const res = await rawClient.api.finance.tags.list.$post({ json: {} })
      return res.json() as Promise<CategoriesListOutput>
    },
    async getMonthlyStats(input) {
      const res = await rawClient.api.finance.analyze['monthly-stats'].$post({ json: input })
      return res.json() as Promise<MonthlyStatsOutput>
    },
    async getSpendingTimeSeries(input) {
      const res = await rawClient.api.finance.analyze['spending-time-series'].$post({ json: input })
      return res.json() as Promise<SpendingTimeSeriesOutput>
    },
    async getTopMerchants(input) {
      const res = await rawClient.api.finance.analyze['top-merchants'].$post({ json: input })
      return res.json() as Promise<TopMerchantsOutput>
    },
    async calculateRunway(input) {
      const res = await rawClient.api.finance.runway.calculate.$post({ json: input })
      return res.json() as Promise<RunwayCalculateOutput>
    },
  }
}
