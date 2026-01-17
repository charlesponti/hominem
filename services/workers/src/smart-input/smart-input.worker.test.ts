import * as fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { processSmartInputEmail } from './smart-input.worker'

vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'test' }),
}))

vi.mock('@hominem/utils/supabase', () => ({
  SupabaseStorageService: vi.fn().mockImplementation(() => ({
    storeFile: vi.fn().mockResolvedValue({
      id: 'test-id',
      originalName: 'test.txt',
      filename: 'system-attachments/test-id.txt',
      mimetype: 'application/octet-stream',
      size: 100,
      url: 'https://storage.supabase.co/test-bucket/test-id.txt',
      uploadedAt: new Date(),
    }),
    downloadCsvFileAsBuffer: vi.fn().mockResolvedValue(Buffer.from('test content')),
  })),
}))

const ASSETS_DIR = path.join(__dirname, './test-assets')
const getAssetPath = (filename: string) => path.join(ASSETS_DIR, filename)

describe.skip('smart-input-worker', () => {
  beforeEach(() => {
    process.env.STORAGE_BUCKET = 'test-bucket'
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

  it('should upload attachments to Supabase storage', async () => {
    const emailContent = fs.readFileSync(getAssetPath('housebroken.eml'), 'utf-8')
    const result = await processSmartInputEmail(emailContent)

    expect(result).toBeDefined()
    const { SupabaseStorageService } = await import('@hominem/utils/supabase')
    const storageInstance = new SupabaseStorageService('test-bucket')
    expect(storageInstance.storeFile).toHaveBeenCalled()
  })
})
