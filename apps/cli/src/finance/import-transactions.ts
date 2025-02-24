import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import csv from 'csv-parser'
import { DrizzleError, sql } from 'drizzle-orm'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { finished } from 'node:stream'
import { db } from '../db'
import { transactions } from '../db/schema'
import { processCopilotTransaction, type CopilotTransaction } from './utils/copilot'

const PROCESSORS = {
  copilot: processCopilotTransaction,
}

const VALID_BANKS: (keyof typeof PROCESSORS)[] = ['copilot']

const importTransactions = new Command()

importTransactions
  .name('import-transactions')
  .description('Import transactions data from supported banks into a SQLite database.')
  .argument('<directory>', 'Directory containing CSV files')
  .requiredOption('--bank <bank>', 'The bank to import transactions from')
  .action(async (directory: string, options) => {
    const { bank } = options as { bank: (typeof VALID_BANKS)[number] }
    const processor = PROCESSORS[bank]

    if (!VALID_BANKS.includes(bank) || !PROCESSORS[bank]) {
      logger.error(`Invalid bank: ${bank}`)
      process.exit(1)
    }

    try {
      const files = fs
        .readdirSync(directory)
        .filter((file) => path.extname(file).toLowerCase() === '.csv')

      // Get the number of transactions currently in the database.
      const initialCount = db.select({ count: sql<number>`count(*)` }).from(transactions).get()

      let processedCount = 0

      for (const file of files) {
        const filePath = path.join(directory, file)
        const fileName = filePath.split('/').pop()
        logger.info(`Started processing file: .../${fileName}`)

        let fileProcessedCount = 0
        const PROGRESS_INTERVAL = 1000 // Log progress every 1000 records

        await new Promise<void>((resolve, reject) => {
          const stream = fs.createReadStream(filePath).pipe(csv())

          const processRow = async (data: CopilotTransaction) => {
            if (await processor(data)) {
              processedCount++
              fileProcessedCount++
              if (fileProcessedCount % PROGRESS_INTERVAL === 0) {
                logger.info(`Processed ${fileProcessedCount} records from ${fileName}`)
              }
            }
          }

          stream.on('data', (data) => {
            processRow(data).catch((err) => stream.emit('error', err))
          })

          stream.on('error', (error) => {
            logger.error('Stream error:', error)
            reject(error)
          })

          stream.on('end', () => {
            logger.info('Stream ended')
          })

          finished(stream, (err) => {
            if (err) return reject(err)
            logger.info(`Finished processing: .../${fileName}`)
            resolve()
          })
        })
      }

      const finalCount = await db.select({ count: sql<number>`count(*)` }).from(transactions).get()

      logger.info(`
        Initial record count: ${initialCount?.count ?? 0}
        Records processed: ${processedCount}
        Final record count: ${finalCount?.count ?? 0}
        New records added: ${(finalCount?.count ?? 0) - (initialCount?.count ?? 0)}
      `)
    } catch (err) {
      logger.error('Error:', err instanceof DrizzleError ? err.message : err)
      process.exit(1)
    }
  })

export default importTransactions
