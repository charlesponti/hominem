import { and, eq, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../../db/index'
import {
  financeAccounts,
  transactions,
  type FinanceAccount,
  type FinanceAccountInsert,
  type FinanceTransaction,
} from '../../db/schema'
import { logger } from '../../logger'

/**
 * Get a map of all accounts by name for efficient lookups
 */
export async function getAccountsMap(): Promise<Map<string, FinanceAccount>> {
  try {
    const accounts = await db.select().from(financeAccounts)
    return new Map(accounts.map((acc) => [acc.name, acc]))
  } catch (error) {
    logger.error('Failed to fetch accounts', error)
    throw error
  }
}

/**
 * Create a new financial account
 */
export async function createAccount(
  account: Omit<FinanceAccountInsert, 'id'>
): Promise<FinanceAccount> {
  try {
    // Enhanced logging of account data being inserted
    logger.info('Creating account with data:', {
      name: account.name,
      type: account.type,
      balance: account.balance,
      userId: account.userId,
      institutionId: account.institutionId,
      meta: account.meta,
    })

    const [createdAccount] = await db
      .insert(financeAccounts)
      .values({
        id: crypto.randomUUID(),
        ...account,
      })
      .returning()

    if (!createdAccount) {
      throw new Error(`Failed to create account: ${account.name}`)
    }

    logger.info(
      `Successfully created account: ${createdAccount.name} with ID: ${createdAccount.id}`
    )
    return createdAccount
  } catch (error) {
    // Enhanced error logging with full error details
    logger.error(`Error creating account ${account.name}:`, {
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      },
      accountData: {
        name: account.name,
        type: account.type,
        balance: account.balance,
        userId: account.userId,
        institutionId: account.institutionId,
      },
    })

    // Also log to console for debugging
    console.error(`Full account creation error for ${account.name}:`, error)
    throw error
  }
}

/**
 * Create multiple financial accounts in a single batch operation.
 */
export async function createManyAccounts(
  accounts: Array<Omit<FinanceAccountInsert, 'id'>>
): Promise<FinanceAccount[]> {
  if (accounts.length === 0) {
    return []
  }

  try {
    const accountsWithIds = accounts.map((acc) => ({
      id: crypto.randomUUID(),
      ...acc,
    }))

    const createdAccounts = await db.insert(financeAccounts).values(accountsWithIds).returning()

    logger.info(`Successfully created ${createdAccounts.length} accounts in a batch.`)
    return createdAccounts
  } catch (error) {
    logger.error('Error creating multiple accounts in a batch:', {
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      accountCount: accounts.length,
    })
    throw error
  }
}

/**
 * List all accounts for a user
 */
export async function listAccounts(userId: string): Promise<FinanceAccount[]> {
  try {
    return await db.query.financeAccounts.findMany({
      where: eq(financeAccounts.userId, userId),
      orderBy: (accounts) => accounts.name,
    })
  } catch (error) {
    logger.error(`Error listing accounts for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get a specific account by ID for a user
 */
export async function getAccountById(id: string, userId: string): Promise<FinanceAccount | null> {
  try {
    const account = await db.query.financeAccounts.findFirst({
      where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
    })
    return account ?? null
  } catch (error) {
    logger.error(`Error fetching account ${id}:`, error)
    throw error
  }
}

/**
 * Update an account
 */
export async function updateAccount(
  id: string,
  userId: string,
  updates: Partial<Omit<FinanceAccountInsert, 'id'>>
): Promise<FinanceAccount> {
  try {
    const [updated] = await db
      .update(financeAccounts)
      .set(updates)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
      .returning()
    if (!updated) {
      throw new Error(`Account not found or not updated: ${id}`)
    }
    return updated
  } catch (error) {
    logger.error(`Error updating account ${id}:`, error)
    throw error
  }
}

/**
 * Delete an account
 */
export async function deleteAccount(id: string, userId: string): Promise<void> {
  try {
    await db
      .delete(financeAccounts)
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
  } catch (error) {
    logger.error(`Error deleting account ${id}:`, error)
    throw error
  }
}

/**
 * List accounts with their recent transactions
 */
export async function listAccountsWithRecentTransactions(
  userId: string,
  transactionLimit = 5
): Promise<Array<FinanceAccount & { transactions: FinanceTransaction[] }>> {
  try {
    const query = sql`
      WITH ranked_transactions AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (PARTITION BY t.account_id ORDER BY t.date DESC) as rn
        FROM ${transactions} t
        WHERE t.user_id = ${userId} AND t.excluded = false AND t.pending = false
      ),
      recent_transactions AS (
        SELECT
          rt.account_id,
          json_agg(json_build_object(
            'id', rt.id,
            'type', rt.type,
            'amount', rt.amount,
            'date', rt.date,
            'description', rt.description,
            'merchantName', rt.merchant_name,
            'accountId', rt.account_id,
            'fromAccountId', rt.from_account_id,
            'toAccountId', rt.to_account_id,
            'eventId', rt.event_id,
            'investmentDetails', rt.investment_details,
            'status', rt.status,
            'category', rt.category,
            'parentCategory', rt.parent_category,
            'excluded', rt.excluded,
            'tags', rt.tags,
            'accountMask', rt.account_mask,
            'note', rt.note,
            'recurring', rt.recurring,
            'plaidTransactionId', rt.plaid_transaction_id,
            'pending', rt.pending,
            'paymentChannel', rt.payment_channel,
            'location', rt.location,
            'source', rt.source,
            'createdAt', rt.created_at,
            'updatedAt', rt.updated_at,
            'userId', rt.user_id
          ) ORDER BY rt.date DESC) as transactions
        FROM ranked_transactions rt
        WHERE rt.rn <= ${transactionLimit}
        GROUP BY rt.account_id
      )
      SELECT
        fa.*,
        COALESCE(rt.transactions, '[]'::json) as transactions
      FROM ${financeAccounts} fa
      LEFT JOIN recent_transactions rt ON fa.id = rt.account_id
      WHERE fa.user_id = ${userId}
      ORDER BY fa.name;
    `
    const result: Array<FinanceAccount & { transactions: FinanceTransaction[] }> =
      await db.execute(query)

    return result.map((account) => ({
      ...account,
      transactions: account.transactions || [],
    }))
  } catch (error) {
    logger.error(`Error listing accounts with recent transactions for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get account balance summary for a user
 */
export async function getAccountBalanceSummary(userId: string) {
  try {
    const accounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
      })
      .from(financeAccounts)
      .where(eq(financeAccounts.userId, userId))

    const totalBalance = accounts.reduce((sum, account) => {
      return sum + Number.parseFloat(account.balance || '0')
    }, 0)

    return {
      accounts,
      totalBalance: totalBalance.toFixed(2),
      accountCount: accounts.length,
    }
  } catch (error) {
    logger.error(`Error getting account balance summary for user ${userId}:`, error)
    throw error
  }
}

/**
 * Update account balance
 */
export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalance: string
): Promise<FinanceAccount> {
  try {
    const [updated] = await db
      .update(financeAccounts)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(and(eq(financeAccounts.id, accountId), eq(financeAccounts.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error(`Account not found or not updated: ${accountId}`)
    }

    logger.info(`Updated balance for account ${accountId} to ${newBalance}`)
    return updated
  } catch (error) {
    logger.error(`Error updating account balance for ${accountId}:`, error)
    throw error
  }
}

export async function getAndCreateAccountsInBulk(
  accountNames: string[],
  userId: string
): Promise<Map<string, FinanceAccount>> {
  const existingAccounts = await listAccounts(userId)
  const existingAccountsMap = new Map(existingAccounts.map((acc) => [acc.name, acc]))

  const newAccountNames = accountNames.filter((name) => !existingAccountsMap.has(name))

  if (newAccountNames.length > 0) {
    const newAccounts = await createManyAccounts(
      newAccountNames.map((name) => ({
        type: 'checking',
        balance: '0',
        name,
        institutionId: null,
        meta: null,
        userId,
      }))
    )
    for (const newAccount of newAccounts) {
      existingAccountsMap.set(newAccount.name, newAccount)
    }
  }

  return existingAccountsMap
}
