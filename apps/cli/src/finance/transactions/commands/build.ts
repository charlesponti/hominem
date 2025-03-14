import { Command } from 'commander'
import fs from 'fs-extra'
import ora from 'ora'
import logger from '../logger'
import { processTransactions } from '../processor'

const command = new Command()

command
  .name('build')
  .description('Process CSVs and build transaction database')
  .argument('<directory>', 'Directory containing CSV files')
  .option(
    '--deduplicate-threshold <number>',
    'Time threshold in minutes to consider transactions as duplicates',
    '60'
  )
  .action(async (directory, options) => {
    const spinner = ora(`Processing transactions in ${directory}`).start()

    try {
      // Ensure the directory exists
      if (!fs.existsSync(directory)) {
        throw new Error(`Directory does not exist: ${directory}`)
      }

      const deduplicateThreshold = Number.parseInt(options.deduplicateThreshold)
      if (Number.isNaN(deduplicateThreshold) || deduplicateThreshold < 0) {
        throw new Error('Deduplicate threshold must be a valid non-negative number')
      }

      // Stats to track progress
      const stats = { processed: 0, skipped: 0, merged: 0, updated: 0 }
      let lastUpdate = Date.now()

      // Consume the generator as transactions are processed
      for await (const result of processTransactions(directory, deduplicateThreshold)) {
        // Update stats based on action
        if (result.action === 'created') stats.processed++
        else if (result.action === 'skipped') stats.skipped++
        else if (result.action === 'merged') stats.merged++
        else if (result.action === 'updated') stats.updated++

        // Update spinner text periodically (not on every transaction to avoid flickering)
        const now = Date.now()
        if (now - lastUpdate > 200) {
          // Update UI every 200ms
          spinner.text = `Processing: ${stats.processed} created, ${stats.skipped} skipped, ${stats.merged + stats.updated} merged/updated`
          lastUpdate = now
        }
      }

      spinner.succeed('Processing completed successfully')
      logger.info(
        `\nProcessed ${stats.processed} new transactions, skipped ${stats.skipped} duplicates, ` +
          `merged/updated ${stats.merged + stats.updated} transactions`
      )
      process.exit(0)
    } catch (error) {
      spinner.fail('Processing failed')
      logger.error(
        `Error processing transactions: ${error instanceof Error ? error.message : error}`
      )
      process.exit(1)
    }
  })

export default command
