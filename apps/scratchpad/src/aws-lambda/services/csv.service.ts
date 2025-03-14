import { openai } from '@ai-sdk/openai'
import { logger } from '@ponti/utils'
import { UserSchema } from '@ponti/utils/schema'
import { generateObject } from 'ai'
import { S3 } from 'aws-sdk'
import csv from 'csv-parser'
import { Readable } from 'node:stream'
import type { z } from 'zod'

const s3 = new S3()

export async function getCSVFromS3(bucketName: string, key: string): Promise<Buffer> {
  logger.info('Fetching S3 object')
  const { Body } = await s3.getObject({ Bucket: bucketName, Key: key }).promise()

  if (!Body) {
    throw new Error('Empty S3 object body')
  }

  return Buffer.from(Body as Buffer)
}

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
  return response.object
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

export async function writeResultsToS3(
  bucketName: string,
  key: string,
  results: unknown
): Promise<string> {
  logger.info('Writing results to S3')
  const outputKey = `processed-${key}`
  await s3
    .putObject({
      Bucket: bucketName,
      Key: outputKey,
      Body: JSON.stringify(results, null, 2),
      ContentType: 'application/json',
    })
    .promise()

  return outputKey
}
