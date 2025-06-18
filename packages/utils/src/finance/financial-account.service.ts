import { and, eq, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../db/index'
import {
  financeAccounts,
  transactions,
  type FinanceAccount,
  type FinanceAccountInsert,
  type FinanceTransaction,
} from '../db/schema'
import { logger } from '../logger'

class FinancialAccountService {
  public async getAccountsMap(): Promise<Map<string, FinanceAccount>> {
    try {
      const accounts = await db.select().from(financeAccounts)
      return new Map(accounts.map((acc) => [acc.name, acc]))
    } catch (error) {
      logger.error('Failed to fetch accounts', error)
      throw error
    }
  }

  public async createAccount(account: Omit<FinanceAccountInsert, 'id'>) {
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

  public async listAccounts(userId: string): Promise<FinanceAccount[]> {
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

  public async getAccountById(id: string, userId: string): Promise<FinanceAccount | null> {
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

  public async updateAccount(
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

  public async deleteAccount(id: string, userId: string): Promise<void> {
    try {
      await db
        .delete(financeAccounts)
        .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
    } catch (error) {
      logger.error(`Error deleting account ${id}:`, error)
      throw error
    }
  }

  public async listAccountsWithRecentTransactions(
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
}

const service = new FinancialAccountService()
export default service
