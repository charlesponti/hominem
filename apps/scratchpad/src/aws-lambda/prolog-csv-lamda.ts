import { logger } from '@ponti/utils/logger'
import { ZodError } from 'zod'
import { getCSVFromS3, processCSVBuffer, writeResultsToS3 } from './services/csv.service'

interface S3Event {
  Records: {
    s3: {
      bucket: {
        name: string
      }
      object: {
        key: string
      }
    }
  }[]
}

export const handler = async (event: S3Event) => {
  try {
    logger.info('Starting CSV Lambda handler', { event })

    const record = event.Records?.[0]
    if (!record) {
      throw new Error('No S3 event records found')
    }

    const bucketName = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
    logger.info('Processing S3 object', { bucketName, key })

    const buffer = await getCSVFromS3(bucketName, key)
    const results = await processCSVBuffer(buffer)
    const outputKey = await writeResultsToS3(bucketName, key, results)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'CSV processed successfully',
        outputKey,
      }),
    }
  } catch (error) {
    logger.error('Lambda handler error', {
      errorName: error instanceof Error ? error.name : 'Unknown error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace available',
    })

    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid data format',
          details: error.errors,
        }),
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing CSV',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}
