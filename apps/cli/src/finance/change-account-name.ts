import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { transactions } from '../db/schema'

const changeAccount = new Command()
changeAccount
  .name('change-account')
  .description('Change the account for a transaction')
  .requiredOption('--old <old_account>', 'The old account name')
  .requiredOption('--new <new_account>', 'The new account name')
  .action(async (options) => {
    try {
      const oldTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.account, options.old))

      /**
       * A transaction isn't used here because successful updates should be persisted
       * even if a single record fails.
       */
      for (const transaction of oldTransactions) {
        await db.transaction(async (trx) => {
          // Ignore the id field
          const { id, ...values } = transaction

          // Migrate old transaction to the new account name
          await trx
            .insert(transactions)
            .values({
              ...values,
              account: options.new,
            })
            // If a conflict exists, it is because the transaction has already been recorded on the new
            // account. In this case, we can safely ignore the conflict.
            .onConflictDoNothing()

          // Delete the old transaction
          await trx.delete(transactions).where(eq(transactions.account, options.old))
        })
      }

      logger.info(`Updated ${oldTransactions.length} rows`)
    } catch (error) {
      logger.error('Error:', error)
    }
  })

export default changeAccount
