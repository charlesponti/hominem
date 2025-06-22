import { db } from '@hominem/utils/db'
import { FinancialAccountService } from '@hominem/utils/finance'
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'

export const financeAccountsRoutes = new Hono()

const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'investment', 'credit']),
  balance: z.number().optional(),
  institution: z.string().optional(),
})

const updateAccountSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
  balance: z.number().optional(),
  institution: z.string().optional(),
})

const linkInstitutionSchema = z.object({
  institutionId: z.string().min(1, 'Institution ID is required'),
  plaidItemId: z.string().optional(),
})

const accountIdParamSchema = z.object({
  id: z.string().min(1, 'Account ID is required'),
})

// Create account
financeAccountsRoutes.post('/', requireAuth, zValidator('json', createAccountSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const validated = c.req.valid('json')

    // Check if account with same name already exists for user
    const existingAccount = await db.query.financeAccounts.findFirst({
      where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.name, validated.name)),
    })

    if (existingAccount) {
      return c.json({ error: 'Account with this name already exists' }, 409)
    }

    // Create new account via service
    const newAccount = await FinancialAccountService.createAccount({
      userId,
      name: validated.name,
      type: validated.type,
      balance: validated.balance?.toString() || '0',
      institutionId: validated.institution || null,
      meta: null,
    })

    return c.json(newAccount, 201)
  } catch (error) {
    // Log detailed error for diagnostics
    console.log({ err: error, userId: c.get('userId') }, 'Error creating finance account')
    return c.json(
      {
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// List accounts
financeAccountsRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // List accounts via service
    const accounts = await FinancialAccountService.listAccounts(userId)
    return c.json(accounts)
  } catch (error) {
    // Log detailed error for diagnostics
    console.log({ err: error, userId: c.get('userId') }, 'Error listing finance accounts')
    return c.json(
      {
        error: 'Failed to list accounts',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get all accounts with comprehensive data (unified endpoint)
financeAccountsRoutes.get('/all', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // Get all finance accounts with institution and Plaid connection info
    const allAccounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        mask: financeAccounts.mask,
        subtype: financeAccounts.subtype,
        institutionId: financeAccounts.institutionId,
        plaidItemId: financeAccounts.plaidItemId,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
        // Institution info from joined table
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        // Plaid connection info
        isPlaidConnected: sql<boolean>`${financeAccounts.plaidItemId} IS NOT NULL`,
        // Plaid connection status info
        plaidItemStatus: plaidItems.status,
        plaidItemError: plaidItems.error,
        plaidLastSyncedAt: plaidItems.lastSyncedAt,
        plaidItemInternalId: plaidItems.id,
        // Get institution ID and name from Plaid item for connections
        plaidInstitutionId: plaidItems.institutionId,
        plaidInstitutionName: financialInstitutions.name,
      })
      .from(financeAccounts)
      .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(eq(financeAccounts.userId, userId))

    // Get recent transactions for each account using the existing service method
    const accountsWithTransactions = await Promise.all(
      allAccounts.map(async (account) => {
        // Use the existing service method to get recent transactions
        const accountWithTransactions =
          await FinancialAccountService.listAccountsWithRecentTransactions(userId, 5)
        const accountData = accountWithTransactions.find((acc) => acc.id === account.id)

        return {
          ...account,
          transactions: accountData?.transactions || [],
        }
      })
    )

    // Get Plaid connections separately starting from plaidItems table
    // This ensures we capture all Plaid connections, even those without corresponding finance accounts
    const plaidConnections = await db
      .select({
        id: plaidItems.id,
        itemId: plaidItems.itemId,
        institutionId: plaidItems.institutionId,
        institutionName: financialInstitutions.name,
        status: plaidItems.status,
        lastSyncedAt: plaidItems.lastSyncedAt,
        error: plaidItems.error,
        createdAt: plaidItems.createdAt,
      })
      .from(plaidItems)
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(eq(plaidItems.userId, userId))

    const uniqueConnections = plaidConnections.map((connection) => ({
      id: connection.id,
      itemId: connection.itemId,
      institutionId: connection.institutionId,
      institutionName: connection.institutionName || 'Unknown Institution',
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      error: connection.error,
      createdAt: connection.createdAt,
    }))

    return c.json({
      accounts: accountsWithTransactions,
      connections: uniqueConnections,
    })
  } catch (error) {
    // Log detailed error for diagnostics
    console.log({ err: error, userId: c.get('userId') }, 'Error fetching all finance accounts')
    return c.json(
      {
        error: 'Failed to fetch accounts',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get account by ID
financeAccountsRoutes.get(
  '/:id',
  requireAuth,
  zValidator('param', accountIdParamSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      // Fetch via service
      const account = await FinancialAccountService.getAccountById(id, userId)
      if (!account) {
        return c.json({ error: 'Account not found' }, 404)
      }

      return c.json(account)
    } catch (error) {
      // Log detailed error for diagnostics
      console.log(
        { err: error, userId: c.get('userId'), id: c.req.valid('param').id },
        'Error fetching finance account by ID'
      )
      return c.json(
        {
          error: 'Failed to fetch account',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Update account
financeAccountsRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', accountIdParamSchema),
  zValidator('json', updateAccountSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')
    const validated = c.req.valid('json')

    try {
      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(id, userId)
      if (!existing) {
        return c.json({ error: 'Account not found' }, 404)
      }

      // If name is being changed, check if new name conflicts with existing account
      if (validated.name && validated.name !== existing.name) {
        const nameConflict = await db.query.financeAccounts.findFirst({
          where: and(
            eq(financeAccounts.userId, userId),
            eq(financeAccounts.name, validated.name),
            eq(financeAccounts.id, id)
          ),
        })

        if (nameConflict) {
          return c.json({ error: 'Another account with this name already exists' }, 409)
        }
      }

      // Update via service
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        ...validated,
        balance: validated.balance?.toString(),
        institutionId: validated.institution,
      })

      return c.json(updatedAccount)
    } catch (error) {
      // Log detailed error for diagnostics
      console.log(
        { err: error, userId: c.get('userId'), id: c.req.valid('param').id },
        'Error updating finance account'
      )
      return c.json(
        {
          error: 'Failed to update account',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete account
financeAccountsRoutes.delete(
  '/:id',
  requireAuth,
  zValidator('param', accountIdParamSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(id, userId)
      if (!existing) {
        return c.json({ error: 'Account not found' }, 404)
      }

      // Delete via service
      await FinancialAccountService.deleteAccount(id, userId)

      return c.json({ success: true, message: 'Account deleted successfully' })
    } catch (error) {
      // Log detailed error for diagnostics
      console.log(
        { err: error, userId: c.get('userId'), id: c.req.valid('param').id },
        'Error deleting finance account'
      )
      return c.json(
        {
          error: 'Failed to delete account',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Link an account to a Plaid institution
financeAccountsRoutes.post(
  '/:id/link-institution',
  requireAuth,
  zValidator('param', accountIdParamSchema),
  zValidator('json', linkInstitutionSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')
    const validated = c.req.valid('json')

    try {
      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(id, userId)
      if (!existingAccount) {
        return c.json({ error: 'Account not found' }, 404)
      }

      // Verify institution exists
      const institution = await db.query.financialInstitutions.findFirst({
        where: eq(financialInstitutions.id, validated.institutionId),
      })

      if (!institution) {
        return c.json({ error: 'Institution not found' }, 404)
      }

      // If plaidItemId provided, verify it exists and belongs to user
      if (validated.plaidItemId) {
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(
            eq(plaidItems.id, validated.plaidItemId),
            eq(plaidItems.userId, userId),
            eq(plaidItems.institutionId, validated.institutionId)
          ),
        })

        if (!plaidItem) {
          return c.json(
            { error: 'Plaid item not found or does not belong to specified institution' },
            404
          )
        }
      }

      // Update account to link with institution
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        institutionId: validated.institutionId,
        plaidItemId: validated.plaidItemId || null,
      })

      return c.json({
        success: true,
        message: 'Account successfully linked to institution',
        account: updatedAccount,
      })
    } catch (error) {
      // Log detailed error for diagnostics
      console.log(
        { err: error, userId: c.get('userId'), id: c.req.valid('param').id },
        'Error linking finance account to institution'
      )
      return c.json(
        {
          error: 'Failed to link account to institution',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Unlink an account from its institution
financeAccountsRoutes.post(
  '/:id/unlink-institution',
  requireAuth,
  zValidator('param', accountIdParamSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(id, userId)
      if (!existingAccount) {
        return c.json({ error: 'Account not found' }, 404)
      }

      // Update account to unlink from institution
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        institutionId: null,
        plaidItemId: null,
      })

      return c.json({
        success: true,
        message: 'Account successfully unlinked from institution',
        account: updatedAccount,
      })
    } catch (error) {
      // Log detailed error for diagnostics
      console.log(
        { err: error, userId: c.get('userId'), id: c.req.valid('param').id },
        'Error unlinking finance account from institution'
      )
      return c.json(
        {
          error: 'Failed to unlink account from institution',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
