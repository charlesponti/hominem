import * as fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processSmartInputEmail } from './smart-input.worker'

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'test' }),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3: vi.fn().mockImplementation(() => ({
    putObject: vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({}),
    }),
  })),
}))

const ASSETS_DIR = path.join(__dirname, './test-assets')
const getAssetPath = (filename: string) => path.join(ASSETS_DIR, filename)

describe.skip('smart-input-worker', () => {
  beforeEach(() => {
    process.env.S3_BUCKET = 'test-bucket'
    vi.clearAllMocks()
  })

  it('should process email event successfully', async () => {
    // Read test event
    const { Records } = JSON.parse(fs.readFileSync(getAssetPath('ses-email-event.json'), 'utf-8'))
    const emailContent = Records[0]?.ses?.mail?.content as string

    const result = await processSmartInputEmail(emailContent)

    expect(result).toBeDefined()
  })

  it('should process housebroken.eml successfully', async () => {
    const emailContent = fs.readFileSync(getAssetPath('housebroken.eml'), 'utf-8')

    const result = await processSmartInputEmail(emailContent)

    expect(result).toEqual([])
  })

  it('should upload attachments to S3', async () => {
    const emailContent = fs.readFileSync(getAssetPath('housebroken.eml'), 'utf-8')
    const result = await processSmartInputEmail(emailContent)

    expect(result).toBeDefined()
    const s3Instance = new (await import('@aws-sdk/client-s3')).S3()
    expect(s3Instance.putObject).toHaveBeenCalled()
    expect(s3Instance.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: expect.stringContaining('attachments/'),
      })
    )
  })
})
