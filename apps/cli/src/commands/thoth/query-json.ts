import { logger } from '@/logger'
import { DuckDBInstance } from '@duckdb/node-api'
import { Command } from 'commander'
import fs from 'node:fs/promises'
import ora from 'ora'

export const queryJsonCommand = new Command('query-json')
  .description('Query JSON file using DuckDB')
  .argument('<jsonFile>', 'Path to JSON file to query')
  .argument('<query>', 'Query condition (e.g. "section=\'thoughts\'")')
  .option('-o, --output <file>', 'Output file path', 'query-results.json')
  .action(async (jsonFile: string, query: string, options: { output: string }) => {
    try {
      const db = await DuckDBInstance.create(':memory:')
      const spinner = ora('Querying JSON data...').start()

      // Create connection and execute query
      const connection = await db.connect()

      // Read JSON file and query it
      const results = await connection.runAndReadAll(`
        SELECT *
        FROM read_json_auto('${jsonFile}', auto_detect=true)
        WHERE ${query}
      `)
      const rows = results.getRowObjectsJson()

      // Write results to file
      await fs.writeFile(options.output, JSON.stringify(rows, null, 2))

      spinner.succeed(`Query results written to ${options.output}`)
      connection.close()
    } catch (error) {
      logger.error('Error querying JSON file:', error)
      process.exit(1)
    }
  })
