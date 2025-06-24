import {
  createNewTransaction,
  deleteTransaction,
  FinancialAccountService,
  queryTransactions,
  updateTransaction,
} from '@hominem/utils/finance'
import { insertTransactionSchema, updateTransactionSchema } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
export const financeTransactionsRoutes = new Hono()

const queryOptionsSchema = z.object({
  from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
  to: z.string().optional().describe('End date in YYYY-MM-DD format'),
  category: z.string().optional().describe('Transaction category'),
  min: z.string().optional().describe('Minimum transaction amount'),
  max: z.string().optional().describe('Maximum transaction amount'),
  account: z.string().optional().describe('Account filter'),
  limit: z.coerce.number().optional().describe('Maximum results to return'),
  offset: z.coerce.number().optional().describe('Number of results to skip for pagination'),
  description: z.string().optional().describe('Description search term'),
  search: z.string().optional().describe('Free text search across multiple fields'),
  sortBy: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Field(s) to sort by'),
  sortDirection: z
    .union([z.enum(['asc', 'desc']), z.array(z.enum(['asc', 'desc']))])
    .optional()
    .describe('Sort direction(s)'),
})

// Get transactions with filtering and pagination
financeTransactionsRoutes.get(
  '/',
  zValidator('query', queryOptionsSchema),
  async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const queryOptions = c.req.valid('query')
      const result = await queryTransactions({ ...queryOptions, userId })
      return c.json(result)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      return c.json(
        {
          error: 'Failed to retrieve transactions',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Add new transaction
financeTransactionsRoutes.post(
  '/',
  zValidator('json', insertTransactionSchema.omit({ userId: true })),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const validatedData = c.req.valid('json')

      // Optional: Validate accountId exists for the user
      if (validatedData.accountId) {
        const account = await FinancialAccountService.getAccountById(
          validatedData.accountId,
          userId
        )
        if (!account) {
          return c.json({ error: 'Account not found' }, 404)
        }
      }

      const newTransaction = await createNewTransaction({ ...validatedData, userId })
      return c.json(newTransaction, 201)
    } catch (error) {
      console.error('Error creating transaction:', error)
      return c.json(
        {
          error: 'Failed to create transaction',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Update transaction
financeTransactionsRoutes.put(
  '/:id',
  zValidator('json', updateTransactionSchema.partial()),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const id = c.req.param('id')

    try {
      const validatedData = c.req.valid('json')

      // Optional: Validate accountId if provided
      if (validatedData.accountId) {
        const account = await FinancialAccountService.getAccountById(
          validatedData.accountId,
          userId
        )
        if (!account) {
          return c.json({ error: 'Account not found' }, 404)
        }
      }

      const updatedTransaction = await updateTransaction(id, userId, validatedData)
      return c.json(updatedTransaction)
    } catch (error) {
      console.error('Error updating transaction:', error)
      return c.json(
        {
          error: 'Failed to update transaction',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete transaction
financeTransactionsRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  const id = c.req.param('id')

  try {
    await deleteTransaction(id, userId)
    return c.json({ success: true, message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return c.json(
      {
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
