import * as fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handler } from './prolog-csv-lamda'
import * as csvService from './services/csv.service'
import { sampleUsers } from './test-fixtures/user.fixtures'

const ASSETS_DIR = path.join(__dirname, './test-assets')
const getAssetPath = (filename: string) => path.join(ASSETS_DIR, filename)

vi.mock('./services/csv.service')

describe('prolog-csv-lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process CSV file successfully', async () => {
    const event = JSON.parse(fs.readFileSync(getAssetPath('s3-csv-event.json'), 'utf-8'))

    vi.mocked(csvService.getCSVFromS3).mockResolvedValue(Buffer.from('test data'))
    vi.mocked(csvService.processCSVBuffer).mockResolvedValue(sampleUsers)
    vi.mocked(csvService.writeResultsToS3).mockResolvedValue('processed/output.json')

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({
      message: 'CSV processed successfully',
      outputKey: 'processed/output.json',
    })
  })

  it('should handle invalid data format', async () => {
    const event = JSON.parse(fs.readFileSync(getAssetPath('s3-csv-event.json'), 'utf-8'))

    vi.mocked(csvService.getCSVFromS3).mockResolvedValue(Buffer.from('test data'))
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
