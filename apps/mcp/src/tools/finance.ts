import { tools as financeTools } from '@hominem/utils/finance'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerFinanceTools(server: McpServer) {
  server.tool(
    'create_finance_account',
    financeTools.create_finance_account.parameters.shape,
    async (args, _extra) => {
      // Callback receives args and extra
      try {
        const result = await financeTools.create_finance_account.execute(args, {
          messages: [],
          toolCallId: 'create_finance_account',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - create_finance_account]', error)
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
    'get_finance_accounts',
    financeTools.get_finance_accounts.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.get_finance_accounts.execute(args, {
          messages: [],
          toolCallId: 'get_finance_accounts',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - get_finance_accounts]', error)
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
    'update_finance_account',
    financeTools.update_finance_account.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.update_finance_account.execute(args, {
          messages: [],
          toolCallId: 'update_finance_account',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - update_finance_account]', error)
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
    'delete_finance_account',
    financeTools.delete_finance_account.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.delete_finance_account.execute(args, {
          messages: [],
          toolCallId: 'delete_finance_account',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - delete_finance_account]', error)
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
    'create_transaction',
    financeTools.create_transaction.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.create_transaction.execute(args, {
          messages: [],
          toolCallId: 'create_transaction',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - create_transaction]', error)
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
    'get_transactions',
    financeTools.get_transactions.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.get_transactions.execute(args, {
          messages: [],
          toolCallId: 'get_transactions',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - get_transactions]', error)
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
    'update_transaction',
    financeTools.update_transaction.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.update_transaction.execute(args, {
          messages: [],
          toolCallId: 'update_transaction',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - update_transaction]', error)
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
    'delete_transaction',
    financeTools.delete_transaction.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.delete_transaction.execute(args, {
          messages: [],
          toolCallId: 'delete_transaction',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - delete_transaction]', error)
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
    'calculate_transactions',
    financeTools.calculate_transactions.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.calculate_transactions.execute(args, {
          messages: [],
          toolCallId: 'calculate_transactions',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - calculate_transactions]', error)
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
    'get_budget_category_suggestions',
    financeTools.get_budget_category_suggestions.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.get_budget_category_suggestions.execute(args, {
          messages: [],
          toolCallId: 'get_budget_category_suggestions',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - get_budget_category_suggestions]', error)
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
    'get_budget_categories',
    financeTools.get_budget_categories.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.get_budget_categories.execute(
          { query: args.query },
          {
            messages: [],
            toolCallId: 'get_budget_categories',
          }
        )
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - get_budget_categories]', error)
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
    'calculate_budget_breakdown',
    financeTools.budgetCalculatorTool.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.budgetCalculatorTool.execute(args, {
          messages: [],
          toolCallId: 'calculate_budget_breakdown',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - budgetCalculatorTool]', error)
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
    'calculate_savings_goal_timeline',
    financeTools.savingsGoalCalculatorTool.parameters.shape,
    async (args, _extra) => {
      try {
        const result = await financeTools.savingsGoalCalculatorTool.execute(args, {
          messages: [],
          toolCallId: 'calculate_savings_goal_timeline',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - savingsGoalCalculatorTool]', error)
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
    async (args, _extra) => {
      try {
        const result = await financeTools.loanCalculatorTool.execute(args, {
          messages: [],
          toolCallId: 'calculate_loan_details',
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        console.error('[MCP Finance Error - loanCalculatorTool]', error)
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
