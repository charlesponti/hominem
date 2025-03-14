import { S3 } from 'aws-sdk'

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

  await s3
    .putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: content,
    })
    .promise()

  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`
}
