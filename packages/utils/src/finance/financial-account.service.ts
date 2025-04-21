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
}

const service = new FinancialAccountService()
export default service
