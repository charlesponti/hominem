import { and, eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../db/index'
import { type FinanceAccount, type FinanceAccountInsert, financeAccounts } from '../db/schema'
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

      return createdAccount
    } catch (error) {
      logger.error(`Error creating account ${account.name}:`, error)
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
}

const service = new FinancialAccountService()
export default service
