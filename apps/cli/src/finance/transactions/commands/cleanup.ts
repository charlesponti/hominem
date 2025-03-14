import { Command } from 'commander'
import ora from 'ora'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db'
import { transactions, transactionAccounts, transactionNames } from '../../../db/schema'
import logger from '../logger'

const command = new Command()

command
  .name('cleanup')
  .description('Clean up duplicate records in the transaction database')
  .action(async () => {
    const spinner = ora('Cleaning up transaction database').start()
    
    try {
      // Step 1: Find duplicate account records
      logger.info('Finding duplicate account records')
      
      // Find transactions with duplicate account entries
      const duplicateAccountsQuery = await db.select({
        transactionId: transactionAccounts.transactionId,
        accountName: transactionAccounts.accountName,
        count: sql<number>`count(*)`,
      })
      .from(transactionAccounts)
      .groupBy(transactionAccounts.transactionId, transactionAccounts.accountName)
      .having(sql`count(*) > 1`)
      
      // Step 2: Find duplicate transaction names
      logger.info('Finding duplicate transaction name records')
      
      // Find transactions with duplicate name entries
      const duplicateNamesQuery = await db.select({
        transactionId: transactionNames.transactionId,
        name: transactionNames.name,
        count: sql<number>`count(*)`,
      })
      .from(transactionNames)
      .groupBy(transactionNames.transactionId, transactionNames.name)
      .having(sql`count(*) > 1`)
      
      if (duplicateAccountsQuery.length === 0 && duplicateNamesQuery.length === 0) {
        spinner.succeed('No duplicate records found')
        return
      }
      
      let totalDuplicatesRemoved = 0
      
      // Process accounts first if there are duplicates
      if (duplicateAccountsQuery.length > 0) {
        logger.info(`Found ${duplicateAccountsQuery.length} transaction-account pairs with duplicates`)
        spinner.text = `Processing ${duplicateAccountsQuery.length} duplicate account records`
        
        // Process each transaction-account pair with duplicates
        for (const duplicate of duplicateAccountsQuery) {
          const { transactionId, accountName, count } = duplicate
          const duplicatesToRemove = count - 1 // Keep one, remove the rest
          
          // Keep only one record for each transaction-account pair
          await db.delete(transactionAccounts)
            .where(
              sql`transaction_id = ${transactionId} AND account_name = ${accountName}`
            )
            .limit(duplicatesToRemove)
          
          totalDuplicatesRemoved += duplicatesToRemove
          logger.info(`Removed ${duplicatesToRemove} duplicate records for transaction ${transactionId}, account ${accountName}`)
        }
      }
      
      // Process transaction names if there are duplicates
      if (duplicateNamesQuery.length > 0) {
        logger.info(`Found ${duplicateNamesQuery.length} transaction-name pairs with duplicates`)
        spinner.text = `Processing ${duplicateNamesQuery.length} duplicate name records`
        
        // Process each transaction-name pair with duplicates
        for (const duplicate of duplicateNamesQuery) {
          const { transactionId, name, count } = duplicate
          const duplicatesToRemove = count - 1 // Keep one, remove the rest
          
          // Keep only one record for each transaction-name pair
          await db.delete(transactionNames)
            .where(
              sql`transaction_id = ${transactionId} AND name = ${name}`
            )
            .limit(duplicatesToRemove)
          
          totalDuplicatesRemoved += duplicatesToRemove
          logger.info(`Removed ${duplicatesToRemove} duplicate records for transaction ${transactionId}, name ${name}`)
        }
      }
      
      // Now check for orphaned account records (accounts without transactions)
      spinner.text = 'Checking for orphaned records'
      
      // Check for orphaned accounts
      const orphanedAccounts = await db.select({
        id: transactionAccounts.transactionId,
        accountName: transactionAccounts.accountName
      })
      .from(transactionAccounts)
      .leftJoin(transactions, eq(transactionAccounts.transactionId, transactions.id))
      .where(sql`${transactions.id} IS NULL`)
      
      if (orphanedAccounts.length > 0) {
        spinner.text = `Removing ${orphanedAccounts.length} orphaned account records`
        
        for (const orphan of orphanedAccounts) {
          await db.delete(transactionAccounts)
            .where(
              sql`transaction_id = ${orphan.id} AND account_name = ${orphan.accountName}`
            )
        }
        
        logger.info(`Removed ${orphanedAccounts.length} orphaned account records`)
        totalDuplicatesRemoved += orphanedAccounts.length
      }
      
      // Check for orphaned names
      const orphanedNames = await db.select({
        id: transactionNames.transactionId,
        name: transactionNames.name
      })
      .from(transactionNames)
      .leftJoin(transactions, eq(transactionNames.transactionId, transactions.id))
      .where(sql`${transactions.id} IS NULL`)
      
      if (orphanedNames.length > 0) {
        spinner.text = `Removing ${orphanedNames.length} orphaned name records`
        
        for (const orphan of orphanedNames) {
          await db.delete(transactionNames)
            .where(
              sql`transaction_id = ${orphan.id} AND name = ${orphan.name}`
            )
        }
        
        logger.info(`Removed ${orphanedNames.length} orphaned name records`)
        totalDuplicatesRemoved += orphanedNames.length
      }
      
      spinner.succeed(`Cleanup completed: Removed ${totalDuplicatesRemoved} duplicate account records`)
      console.log(`Successfully removed ${totalDuplicatesRemoved} duplicate account records`)
      
    } catch (error) {
      spinner.fail('Cleanup failed')
      logger.error(error)
      console.error(`Error cleaning up transactions: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

export default command