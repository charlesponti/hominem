import { S3 } from '@aws-sdk/client-s3'
import { logger } from '@hominem/utils/logger'

const s3 = new S3()
const S3_BUCKET = process.env.S3_BUCKET

export async function uploadToS3(attachment: {
  content: Buffer
  filename: string
}): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET environment variable is not defined')
  }

  const { content, filename } = attachment
  const key = `attachments/${Date.now()}-${filename}`

  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: key,
    Body: content,
  })

  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`
}

export async function writeJSONToS3(
  bucketName: string,
  key: string,
  results: unknown
): Promise<string> {
  logger.info('Writing results to S3')
  const outputKey = `processed-${key}`

  await s3.putObject({
    Bucket: bucketName,
    Key: outputKey,
    Body: JSON.stringify(results, null, 2),
    ContentType: 'application/json',
  })

  return outputKey
}

export async function getObjectFromS3(bucketName: string, key: string): Promise<Buffer> {
  logger.info({ msg: 'Fetching S3 object from bucket', bucketName, key })
  const { Body } = await s3.getObject({ Bucket: bucketName, Key: key })

  if (!Body) {
    logger.error({ msg: 'S3 object body is empty', bucketName, key })
    throw new Error('Empty S3 object body')
  }

  return Buffer.from(await Body.transformToString())
}
