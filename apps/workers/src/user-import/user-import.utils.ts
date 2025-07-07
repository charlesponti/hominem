import { openai } from '@ai-sdk/openai'
import { logger } from '@hominem/utils/logger'
import { UserSchema } from '@hominem/data/schema'
import { generateObject } from 'ai'
import csv from 'csv-parser'
import { Readable } from 'node:stream'
import type { z } from 'zod'

async function processCSVRow(row: Record<string, string>): Promise<z.infer<typeof UserSchema>> {
  const response = await generateObject({
    model: openai('gpt-4o-mini', { structuredOutputs: true }),
    messages: [
      {
        role: 'system',
        content: 'Process this CSV row and extract relevant user information.',
      },
      {
        role: 'user',
        content: JSON.stringify(row),
      },
    ],
    schema: UserSchema,
  })

  await new Promise((resolve) => setTimeout(resolve, 30000)) // Rate limiting

  return response.object as z.infer<typeof UserSchema>
}

export async function processCSVBuffer(buffer: Buffer): Promise<z.infer<typeof UserSchema>[]> {
  const results: z.infer<typeof UserSchema>[] = []

  await new Promise<void>((resolve, reject) => {
    let rowCount = 0
    Readable.from(buffer)
      .pipe(csv())
      .on('data', async (row) => {
        rowCount++
        logger.debug('Processing row', { rowNumber: rowCount })
        try {
          const processedRow = await processCSVRow(row)
          results.push(processedRow)
        } catch (error) {
          logger.error('Row processing error', {
            rowNumber: rowCount,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })
      .on('end', () => {
        logger.info('CSV processing completed', {
          totalRows: rowCount,
          successfulRows: results.length,
        })
        resolve()
      })
      .on('error', (error) => {
        logger.error('CSV stream error', { error })
        reject(error)
      })
  })

  return results
}
