import { randomUUID } from 'node:crypto'
import { db } from '@hominem/db'
import {
  type FinanceAccountInsert,
  type FinanceTransaction,
  financeAccounts,
  plaidItems,
  transactions,
} from '@hominem/db/schema'
import { logger } from '@hominem/utils/logger'
import { and, eq } from 'drizzle-orm'

export class PlaidService {
  /**
   * Get a Plaid item by user ID and item ID
   */
  async getPlaidItem(userId: string, itemId: string) {
    return await db.query.plaidItems.findFirst({
      where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)),
    })
  }

  /**
   * Upsert a finance account (insert or update based on existence)
   */
  async upsertAccount(accountData: {
    name: string
    officialName: string | null
    type: string
    subtype: string | null
    mask: string | null
    balance: number
    availableBalance: number | null
    limit: number | null
    isoCurrencyCode: string
    plaidAccountId: string
    plaidItemId: string
    institutionId: string
    userId: string
  }) {
    // Check if account already exists
    const existingAccount = await db.query.financeAccounts.findFirst({
      where: eq(financeAccounts.plaidAccountId, accountData.plaidAccountId),
    })

    if (existingAccount) {
      // Update existing account
      await db
        .update(financeAccounts)
        .set({
          balance: accountData.balance.toFixed(2),
          lastUpdated: new Date(),
        })
        .where(eq(financeAccounts.id, existingAccount.id))

      logger.info({
        message: 'Updated existing account',
        accountId: existingAccount.id,
        plaidAccountId: accountData.plaidAccountId,
      })

      return existingAccount.id
    }
    // Insert new account
    const newAccountId = randomUUID()
    await db.insert(financeAccounts).values({
      id: newAccountId,
      ...accountData,
      type: accountData.type as FinanceAccountInsert['type'],
      balance: accountData.balance.toFixed(2),
      limit: accountData.limit?.toExponential(2),
      interestRate: null,
      minimumPayment: null,
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info({
      message: 'Created new account',
      plaidAccountId: accountData.plaidAccountId,
    })

    return newAccountId
  }

  /**
   * Get all finance accounts for a user and plaid item
   */
  async getUserAccounts(userId: string, plaidItemId: string) {
    return await db.query.financeAccounts.findMany({
      where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.plaidItemId, plaidItemId)),
    })
  }

  /**
   * Insert a new transaction
   */
  async insertTransaction(transactionData: {
    type: FinanceTransaction['type']
    amount: string
    date: Date
    description: string
    merchantName: string | null
    accountId: string
    category: string | null
    parentCategory: string | null
    pending: boolean
    paymentChannel: string
    location: any
    plaidTransactionId: string
    userId: string
  }) {
    const transactionId = randomUUID()
    await db.insert(transactions).values({
      id: transactionId,
      ...transactionData,
      source: 'plaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return transactionId
  }

  /**
   * Check if a transaction exists by Plaid transaction ID
   */
  async getTransactionByPlaidId(plaidTransactionId: string) {
    return await db.query.transactions.findFirst({
      where: eq(transactions.plaidTransactionId, plaidTransactionId),
    })
  }

  /**
   * Update an existing transaction
   */
  async updateTransaction(
    transactionId: string,
    updateData: {
      type: FinanceTransaction['type']
      amount: string
      date: Date
      description: string
      merchantName: string | null
      category: string | null
      parentCategory: string | null
      pending: boolean
    }
  ) {
    await db
      .update(transactions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
  }

  /**
   * Delete a transaction by Plaid transaction ID
   */
  async deleteTransaction(plaidTransactionId: string) {
    const existingTransaction = await this.getTransactionByPlaidId(plaidTransactionId)
    if (existingTransaction) {
      await db.delete(transactions).where(eq(transactions.id, existingTransaction.id))
      return true
    }
    return false
  }

  /**
   * Update the transactions cursor for a Plaid item
   */
  async updatePlaidItemCursor(itemId: string, cursor: string) {
    await db
      .update(plaidItems)
      .set({
        transactionsCursor: cursor,
      })
      .where(eq(plaidItems.id, itemId))
  }

  /**
   * Update the sync status and last synced timestamp for a Plaid item
   */
  async updatePlaidItemSyncStatus(itemId: string, status: string, error?: string | null) {
    await db
      .update(plaidItems)
      .set({
        lastSyncedAt: new Date(),
        status,
        error,
        updatedAt: new Date(),
      })
      .where(eq(plaidItems.id, itemId))
  }

  /**
   * Get a finance account by Plaid account ID
   */
  async getAccountByPlaidId(plaidAccountId: string) {
    return await db.query.financeAccounts.findFirst({
      where: eq(financeAccounts.plaidAccountId, plaidAccountId),
    })
  }
}
