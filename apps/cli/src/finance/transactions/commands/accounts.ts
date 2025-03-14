import { Command } from 'commander'
import ora from 'ora'
import { eq } from 'drizzle-orm'
import { db } from '../../../db'
import { accounts } from '../../../db/schema'
import logger from '../logger'

const command = new Command()

command
  .name('accounts')
  .description('Manage financial accounts')

// List accounts command
command
  .command('list')
  .description('List all financial accounts')
  .option('--active-only', 'Show only active accounts', false)
  .action(async (options) => {
    const spinner = ora('Fetching accounts').start()
    
    try {
      let query = db.select().from(accounts)
      
      if (options.activeOnly) {
        query = query.where(eq(accounts.isActive, true))
      }
      
      const accountsList = await query
      
      spinner.stop()
      
      if (accountsList.length === 0) {
        console.log('No accounts found')
        return
      }
      
      console.log(`Found ${accountsList.length} accounts:`)
      console.log('ID | Name | Mask | Type | Institution | Active')
      console.log('---------------------------------------------------')
      
      accountsList.forEach(account => {
        console.log(`${account.id} | ${account.name} | ${account.mask || '-'} | ${account.type || '-'} | ${account.institution || '-'} | ${account.isActive ? 'Yes' : 'No'}`)
      })
      
    } catch (error) {
      spinner.fail('Failed to fetch accounts')
      logger.error(error)
      console.error(`Error fetching accounts: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

// Update account command
command
  .command('update')
  .description('Update account information')
  .argument('<id>', 'Account ID to update')
  .option('--name <name>', 'New account name')
  .option('--type <type>', 'Account type (checking, savings, credit, etc.)')
  .option('--institution <institution>', 'Financial institution')
  .option('--activate', 'Set account as active')
  .option('--deactivate', 'Set account as inactive')
  .action(async (id, options) => {
    const spinner = ora(`Updating account ${id}`).start()
    
    try {
      // First check if the account exists
      const account = await db.select().from(accounts).where(eq(accounts.id, parseInt(id))).limit(1)
      
      if (account.length === 0) {
        spinner.fail(`Account with ID ${id} not found`)
        process.exit(1)
      }
      
      // Build update object
      const updates: any = {}
      
      if (options.name) updates.name = options.name
      if (options.type) updates.type = options.type
      if (options.institution) updates.institution = options.institution
      if (options.activate) updates.isActive = true
      if (options.deactivate) updates.isActive = false
      
      // Update timestamp
      updates.updatedAt = new Date().toISOString()
      
      if (Object.keys(updates).length === 0) {
        spinner.info('No changes specified')
        return
      }
      
      // Perform update
      await db.update(accounts)
        .set(updates)
        .where(eq(accounts.id, parseInt(id)))
      
      spinner.succeed(`Account ${id} updated successfully`)
      
    } catch (error) {
      spinner.fail(`Failed to update account ${id}`)
      logger.error(error)
      console.error(`Error updating account: ${error instanceof Error ? error.message : error}`)
      process.exit(1)
    }
  })

export default command