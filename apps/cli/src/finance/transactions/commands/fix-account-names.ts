import { Command } from 'commander'
import { and, eq, isNull, like, sql } from 'drizzle-orm'
import ora from 'ora'
import { db } from '../../../db'
import { accounts, transactionAccounts, transactions } from '../../../db/schema'
import logger from '../logger'

interface CommandOptions {
  oldName: string
  newName: string
}

const command = new Command()
  .name('fix-account-names')
  .requiredOption('-o, --oldName <name>', 'Old account name to correct')
  .requiredOption('-n, --newName <name>', 'Corrected account name')
  .description('Fix misspelled account names in transaction data')
  .action(async (options: CommandOptions) => {
    const spinner = ora('Fixing account names').start()

    try {
      // Check if we have a connection to the database
      if (!db) {
        throw new Error('Database connection not available')
      }

      const { oldName, newName } = options
      let totalUpdated = 0

      // Begin transaction
      await db.transaction(async (tx) => {
        // First, find all accounts with the incorrect name
        const records = await tx.query.accounts.findMany({
          where: like(accounts.name, `%${oldName}%`),
        })

        // For each affected account, check if it would conflict with an existing account after correction
        for (const acc of records) {
          const correctedName = acc.name.replace(oldName, newName)

          // Check for potential conflicts
          const conflicts = await tx.query.accounts.findMany({
            where: and(
              eq(accounts.name, correctedName),
              acc.mask ? eq(accounts.mask, acc.mask) : isNull(accounts.mask)
            ),
          })

          if (conflicts.length > 0) {
            // If there's a conflict, we need to handle it
            logger.info(
              `Found conflict for account "${acc.name}" with corrected name "${correctedName}"`
            )

            // Merge the transactions from this account to the existing correct account
            const conflictId = conflicts[0].id

            // Find all transaction_accounts records for this account
            const txAccounts = await tx.query.transactionAccounts.findMany({
              where: eq(transactionAccounts.accountId, acc.id),
            })

            let redirectCount = 0

            // For each transaction linked to this account, check if it would conflict
            for (const txAccount of txAccounts) {
              // Check if this transaction already has a link to the correct account
              const txConflicts = await tx.query.transactionAccounts.findMany({
                where: and(
                  eq(transactionAccounts.transactionId, txAccount.transactionId),
                  eq(transactionAccounts.accountId, conflictId)
                ),
              })

              if (txConflicts.length === 0) {
                // No conflict, update this record
                await tx
                  .update(transactionAccounts)
                  .set({ accountId: conflictId })
                  .where(
                    and(
                      eq(transactionAccounts.transactionId, txAccount.transactionId),
                      eq(transactionAccounts.accountId, acc.id)
                    )
                  )
                  .execute()
                redirectCount++
              } else {
                // Conflict exists, delete this record
                await tx
                  .delete(transactionAccounts)
                  .where(
                    and(
                      eq(transactionAccounts.transactionId, txAccount.transactionId),
                      eq(transactionAccounts.accountId, acc.id)
                    )
                  )
                  .execute()
              }
            }

            logger.info(
              `Redirected ${redirectCount} transactions from account ID ${acc.id} to ${conflictId}`
            )

            // Delete the conflicting account
            await tx.delete(accounts).where(eq(accounts.id, acc.id)).execute()

            logger.info(`Deleted conflicting account ID ${acc.id}`)
          } else {
            // No conflict, just update the name
            await tx
              .update(accounts)
              .set({ name: correctedName })
              .where(eq(accounts.id, acc.id))
              .execute()

            logger.info(`Updated account ID ${acc.id} from "${acc.name}" to "${correctedName}"`)
          }
        }

        // Update transactions table
        const txResult = await tx
          .update(transactions)
          .set({ account: sql`REPLACE(account, ${oldName}, ${newName})` })
          .where(like(transactions.account, `%${oldName}%`))
          .execute()
        logger.info(`Updated ${txResult.rowsAffected} transactions with account name corrections`)

        // Update transaction_accounts table
        const acctResult = await tx
          .update(transactionAccounts)
          .set({ accountName: sql`REPLACE(account_name, ${oldName}, ${newName})` })
          .where(like(transactionAccounts.accountName, `%${oldName}%`))
          .execute()
        logger.info(
          `Updated ${acctResult.rowsAffected} transaction_accounts entries with name corrections`
        )

        // Log summary for this correction
        logger.info(
          `Replaced "${oldName}" with "${newName}" in accounts, transactions, and transaction_accounts tables`
        )
        totalUpdated += txResult.rowsAffected + acctResult.rowsAffected + records.length
      })

      spinner.succeed(`Fixed account names in ${totalUpdated} records`)
    } catch (error) {
      spinner.fail('Failed to fix account names')
      logger.error(error)
      console.error(`Error: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

export default command
