import {
  categoryBreakdownSchema,
  tools as financeTools,
  runwayCalculationSchema,
} from '@hominem/utils/finance'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getAuthenticatedClient, handleApiError } from '../utils/auth.utils.js'

export function registerFinanceTools(server: McpServer) {
  // Lazy initialize the API client - only create it when a tool is actually called
  const getApiClient = () => getAuthenticatedClient()

  server.tool(
    'create_finance_account',
    financeTools.create_finance_account.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const response = await getApiClient().post('/api/finance/accounts', args)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'create_finance_account')
      }
    }
  )

  server.tool(
    'get_finance_accounts',
    financeTools.get_finance_accounts.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const response = await getApiClient().get('/api/finance/accounts', { params: args })
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'get_finance_accounts')
      }
    }
  )

  server.tool(
    'update_finance_account',
    financeTools.update_finance_account.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const { accountId, ...updateData } = args
        if (!accountId) {
          throw new Error('Account ID is required for update.')
        }
        const response = await getApiClient().put(`/api/finance/accounts/${accountId}`, updateData)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'update_finance_account')
      }
    }
  )

  server.tool(
    'delete_finance_account',
    financeTools.delete_finance_account.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const { accountId } = args
        if (!accountId) {
          throw new Error('Account ID is required for deletion.')
        }
        const response = await getApiClient().delete(`/api/finance/accounts/${accountId}`)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'delete_finance_account')
      }
    }
  )

  // --- Transaction Management --- (Refactored)
  server.tool(
    'create_transaction',
    financeTools.create_transaction.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const response = await getApiClient().post('/api/finance/transactions', args)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'create_transaction')
      }
    }
  )

  server.tool(
    'get_transactions',
    financeTools.get_transactions.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const response = await getApiClient().get('/api/finance/transactions', { params: args })
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'get_transactions')
      }
    }
  )

  server.tool(
    'update_transaction',
    financeTools.update_transaction.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const { transactionId, ...updateData } = args
        if (!transactionId) {
          throw new Error('Transaction ID is required for update.')
        }
        const response = await getApiClient().put(
          `/api/finance/transactions/${transactionId}`,
          updateData
        )
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'update_transaction')
      }
    }
  )

  server.tool(
    'delete_transaction',
    financeTools.delete_transaction.parameters.omit({ userId: true }).shape,
    async (args) => {
      try {
        const { transactionId } = args
        if (!transactionId) {
          throw new Error('Transaction ID is required for deletion.')
        }
        const response = await getApiClient().delete(`/api/finance/transactions/${transactionId}`)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'delete_transaction')
      }
    }
  )

  server.tool(
    'get_spending_categories',
    z.object({}).describe('No parameters').shape,
    async (args) => {
      try {
        const response = await getApiClient().get('/api/finance/categories', { params: args })
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'get_spending_categories')
      }
    }
  )

  server.tool(
    'get_spending_time_series',
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      account: z.string().optional(),
      category: z.string().optional(),
      limit: z.string().transform(Number).optional(),
      groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
      includeStats: z.coerce.boolean().optional().default(false),
      compareToPrevious: z.coerce.boolean().optional().default(false),
    }).shape,
    async (args) => {
      try {
        const response = await getApiClient().get('/api/finance/analyze/spending-time-series', {
          params: args,
        })
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'get_spending_time_series')
      }
    }
  )

  server.tool('get_top_merchants', z.object({}).describe('No parameters').shape, async () => {
    try {
      const response = await getApiClient().get('/api/finance/analyze/top-merchants')
      return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
    } catch (error) {
      return handleApiError(error, 'get_top_merchants')
    }
  })

  server.tool('get_category_breakdown', categoryBreakdownSchema.shape, async (args) => {
    try {
      const response = await getApiClient().get('/api/finance/analyze/category-breakdown', {
        params: args,
      })
      return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
    } catch (error) {
      return handleApiError(error, 'get_category_breakdown')
    }
  })

  server.tool(
    'calculate_budget_breakdown',
    financeTools.budgetCalculatorTool.parameters.shape,
    async (args) => {
      try {
        const response = await getApiClient().post('/api/personal-finance/budget', args)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'calculate_budget_breakdown')
      }
    }
  )

  server.tool('calculate_runway', runwayCalculationSchema.shape, async (args) => {
    try {
      const response = await getApiClient().post('/api/personal-finance/runway', args)
      return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
    } catch (error) {
      return handleApiError(error, 'calculate_runway')
    }
  })

  server.tool(
    'calculate_transactions',
    financeTools.calculate_transactions.parameters.omit({ userId: undefined }).shape,
    async (args) => {
      try {
        const response = await getApiClient().post('/api/finance/analyze/calculate', args)
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] }
      } catch (error) {
        return handleApiError(error, 'calculate_transactions')
      }
    }
  )

  server.tool(
    'calculate_savings_goal_timeline',
    financeTools.savingsGoalCalculatorTool.parameters.shape,
    async (args) => {
      try {
        const result = await financeTools.savingsGoalCalculatorTool.execute(args, {
          messages: [],
          toolCallId: '',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - savingsGoalCalculatorTool Direct]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
        }
      }
    }
  )

  server.tool(
    'calculate_loan_details',
    financeTools.loanCalculatorTool.parameters.shape,
    async (args) => {
      try {
        const result = await financeTools.loanCalculatorTool.execute(args, {
          messages: [],
          toolCallId: '',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - loanCalculatorTool Direct]', error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: error instanceof Error ? error.message : String(error) },
                null,
                2
              ),
            },
          ],
        }
      }
    }
  )
}
