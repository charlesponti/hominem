import * as fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleUsers } from '../../test-assets/fixtures/user.fixtures'
import * as s3Service from '../services/s3.service'
import { handler } from './user-import.function'
import * as csvService from './user-import.utils'

const ASSETS_DIR = path.join(__dirname, './test-assets')
const getAssetPath = (filename: string) => path.join(ASSETS_DIR, filename)

vi.mock('./services/csv.service')
vi.mock('./services/s3.service')

describe.skip('prolog-csv-lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process CSV file successfully', async () => {
    const event = JSON.parse(fs.readFileSync(getAssetPath('s3-csv-event.json'), 'utf-8'))

    vi.mocked(csvService.processCSVBuffer).mockResolvedValue(sampleUsers)
    vi.mocked(s3Service.getObjectFromS3).mockResolvedValue(Buffer.from('test data'))
    vi.mocked(s3Service.writeJSONToS3).mockResolvedValue('processed/output.json')

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({
      message: 'CSV processed successfully',
      outputKey: 'processed/output.json',
    })
  })

  it('should handle invalid data format', async () => {
    const event = JSON.parse(fs.readFileSync(getAssetPath('s3-csv-event.json'), 'utf-8'))

    vi.mocked(s3Service.getObjectFromS3).mockResolvedValue(Buffer.from('test data'))
    vi.mocked(csvService.processCSVBuffer).mockRejectedValue(new Error('Invalid data format'))

    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Error processing CSV',
    })
  })

  it('should handle missing S3 records', async () => {
    const event = { Records: [] }

    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    expect(JSON.parse(result.body)).toMatchObject({
      message: 'Error processing CSV',
      error: 'No S3 event records found',
    })
  })
})
