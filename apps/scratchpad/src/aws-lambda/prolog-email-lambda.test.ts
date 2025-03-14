import * as fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handler, type LambdaEvent } from './prolog-email-lambda'

vi.mock('aws-sdk', () => ({
  S3: vi.fn().mockImplementation(() => ({
    putObject: vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({}),
    }),
  })),
}))

const ASSETS_DIR = path.join(__dirname, './test-assets')
const getAssetPath = (filename: string) => path.join(ASSETS_DIR, filename)

describe('prolog-email-lambda', () => {
  beforeEach(() => {
    process.env.S3_BUCKET = 'test-bucket'
    vi.clearAllMocks()
  })

  it('should process email event successfully', async () => {
    // Read test event
    const event = JSON.parse(fs.readFileSync(getAssetPath('ses-email-event.json'), 'utf-8'))

    // Run handler
    const result = await handler(event)

    // Assertions
    expect(result.statusCode).toBe(200)
    expect(result.body).toBeDefined()
  })

  it('should process housebroken.eml successfully', async () => {
    const emailContent = fs.readFileSync(getAssetPath('housebroken.eml'), 'utf-8')

    const event: LambdaEvent = {
      Records: [
        {
          ses: {
            mail: {
              content: emailContent,
            },
          },
        },
      ],
    }

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual({})
  }, 20000)

  it('should upload attachments to S3', async () => {
    const emailContent = fs.readFileSync(getAssetPath('housebroken.eml'), 'utf-8')
    const event: LambdaEvent = {
      Records: [
        {
          ses: {
            mail: {
              content: emailContent,
            },
          },
        },
      ],
    }

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const s3Instance = new (await import('aws-sdk')).S3()
    expect(s3Instance.putObject).toHaveBeenCalled()
    expect(s3Instance.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: expect.stringContaining('attachments/'),
      })
    )
  }, 20000)
})
