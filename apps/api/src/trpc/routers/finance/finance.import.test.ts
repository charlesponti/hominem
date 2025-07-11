import fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '../../../../test/api-test-utils.js'

// Mock dependencies
vi.mock('@hominem/utils/imports', () => ({
  getJobStatus: vi.fn(),
  getUserJobs: vi.fn(),
}))

vi.mock('@hominem/utils/supabase', () => ({
  csvStorageService: {
    uploadCsvFile: vi.fn(),
  },
}))

vi.mock('../../../middleware/supabase.js', () => ({
  getHominemUser: vi.fn(),
  supabaseClient: {
    auth: {
      getUser: vi.fn(),
    },
  },
  supabaseMiddleware: vi.fn(() => async (c: unknown, next: () => Promise<void>) => {
    ;(c as { set: (key: string, value: unknown) => void }).set('user', {
      id: 'test-user-id',
      email: 'test@example.com',
    })
    ;(c as { set: (key: string, value: unknown) => void }).set('userId', 'test-user-id')
    ;(c as { set: (key: string, value: unknown) => void }).set('supabaseId', 'test-supabase-id')
    await next()
  }),
}))

vi.mock('../../../middleware/file-upload.js', () => ({
  handleFileUpload: vi.fn(),
  handleFileUploadBuffer: vi.fn(),
}))

// Mock BullMQ Queue
const mockQueueAdd = vi.fn()
const mockQueueGetJob = vi.fn()
const mockQueueGetJobs = vi.fn()
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    getJob: mockQueueGetJob,
    getJobs: mockQueueGetJobs,
    close: vi.fn(() => Promise.resolve()),
  })),
}))

// Mock file system
vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

interface ImportApiResponse {
  success?: boolean
  jobId?: string
  fileName?: string
  status?: string
  message?: string
  error?: string
  details?: string
  jobs?: Array<{
    jobId: string
    userId: string
    fileName: string
    status: string
    progress?: number
  }>
  progress?: number
  stats?: object
}

describe('Finance Import Routes', () => {
  const { getServer } = useApiTestLifecycle()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/finance/import', () => {
    test('successfully imports CSV file', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')
      const { csvStorageService } = await import('@hominem/utils/supabase')

      // Mock file upload
      const mockFile = {
        filename: 'transactions.csv',
        mimetype: 'text/csv',
        buffer: Buffer.from('date,amount,description\n2023-01-01,100.50,Test transaction'),
        size: 1024,
      }
      vi.mocked(handleFileUploadBuffer).mockResolvedValue(mockFile)

      // Mock file system
      vi.mocked(fs.readFileSync).mockReturnValue(
        'date,amount,description\n2023-01-01,100.50,Test transaction'
      )

      // Mock storage service
      vi.mocked(csvStorageService.uploadCsvFile).mockResolvedValue(
        'uploads/user123/transactions.csv'
      )

      // Mock no existing jobs in BullMQ
      mockQueueGetJobs.mockResolvedValue([])

      // Mock queue
      mockQueueAdd.mockResolvedValue({ id: 'job-123' })

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import?deduplicateThreshold=70&batchSize=25',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.success).toBe(true)
      expect(body.jobId).toBe('job-123')
      expect(body.fileName).toBe('transactions.csv')
      expect(body.status).toBe('queued')

      // Verify queue job creation
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'import-transaction',
        expect.objectContaining({
          csvFilePath: 'uploads/user123/transactions.csv',
          fileName: 'transactions.csv',
          deduplicateThreshold: 70,
          batchSize: 25,
          batchDelay: 200,
          userId: 'test-user-id',
          status: 'queued',
          type: 'import-transactions',
          createdAt: expect.any(Number),
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        })
      )
    })

    test('returns existing job if file is already being processed', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')
      const { csvStorageService } = await import('@hominem/utils/supabase')

      // Mock file upload
      const mockFile = {
        filename: 'transactions.csv',
        mimetype: 'text/csv',
        buffer: Buffer.from('date,amount,description\n2023-01-01,100.50,Test transaction'),
        size: 1024,
      }
      vi.mocked(handleFileUploadBuffer).mockResolvedValue(mockFile)

      // Mock file system
      vi.mocked(fs.readFileSync).mockReturnValue(
        'date,amount,description\n2023-01-01,100.50,Test transaction'
      )

      // Mock storage service
      vi.mocked(csvStorageService.uploadCsvFile).mockResolvedValue(
        'uploads/user123/transactions.csv'
      )

      // Mock existing job in BullMQ
      const existingJob = {
        id: 'existing-job-123',
        data: {
          fileName: 'transactions.csv',
          userId: 'test-user-id',
        },
        finishedOn: null,
        failedReason: null,
      }
      mockQueueGetJobs.mockResolvedValue([existingJob])

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.success).toBe(true)
      expect(body.jobId).toBe('existing-job-123')
      expect(body.status).toBe('processing')
      expect(body.message).toBe('File is already being processed')

      // Verify queue was not called
      expect(mockQueueAdd).not.toHaveBeenCalled()
    })

    test('rejects non-CSV files', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')

      // Mock non-CSV file upload
      const mockFile = {
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 1024,
      }
      vi.mocked(handleFileUploadBuffer).mockResolvedValue(mockFile)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import',
      })

      await assertErrorResponse(response, 400)
    })

    test('handles missing file upload', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')

      // Mock no file uploaded
      vi.mocked(handleFileUploadBuffer).mockResolvedValue(null)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import',
      })

      const body = await assertErrorResponse(response, 400)
      expect(body.error).toBe('No file uploaded')
    })

    test('handles file upload errors', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')

      // Mock file upload error
      vi.mocked(handleFileUploadBuffer).mockRejectedValue(new Error('Upload failed'))

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import',
      })

      const body = await assertErrorResponse(response, 500)
      expect(body.error).toBe('Failed to process import')
      expect(body.details).toBe('Upload failed')
    })

    test('validates query parameters', async () => {
      const { handleFileUploadBuffer } = await import('../../../middleware/file-upload.js')

      // Mock valid file upload
      const mockFile = {
        filename: 'transactions.csv',
        mimetype: 'text/csv',
        buffer: Buffer.from('date,amount,description\n2023-01-01,100.50,Test transaction'),
        size: 1024,
      }
      vi.mocked(handleFileUploadBuffer).mockResolvedValue(mockFile)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/import?deduplicateThreshold=150', // Invalid: > 100
      })

      await assertErrorResponse(response, 400)
    })
  })

  describe('GET /api/finance/import/:jobId', () => {
    test('returns job status from BullMQ', async () => {
      const mockJob = {
        id: 'job-123',
        finishedOn: null,
        failedReason: null,
        progress: 50,
        data: { fileName: 'transactions.csv' },
        returnvalue: { stats: { processed: 10, errors: 0 } },
      }
      mockQueueGetJob.mockResolvedValue(mockJob)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/job-123',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.jobId).toBe('job-123')
      expect(body.status).toBe('processing')
      expect(body.fileName).toBe('transactions.csv')
      expect(body.progress).toBe(50)
      expect(body.stats).toEqual({ processed: 10, errors: 0 })
    })

    test('returns completed job status', async () => {
      const mockJob = {
        id: 'job-123',
        finishedOn: Date.now(),
        failedReason: null,
        progress: 100,
        data: { fileName: 'transactions.csv' },
        returnvalue: { stats: { processed: 100, errors: 0 } },
      }
      mockQueueGetJob.mockResolvedValue(mockJob)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/job-123',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.status).toBe('done')
    })

    test('returns failed job status', async () => {
      const mockJob = {
        id: 'job-123',
        finishedOn: null,
        failedReason: 'Processing error',
        progress: 25,
        data: { fileName: 'transactions.csv' },
        returnvalue: null,
      }
      mockQueueGetJob.mockResolvedValue(mockJob)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/job-123',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.status).toBe('error')
      expect(body.error).toBe('Processing error')
    })

    test('returns 404 for non-existent job', async () => {
      // Mock job not found in BullMQ
      mockQueueGetJob.mockResolvedValue(null)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/non-existent-job',
      })

      const body = await assertErrorResponse(response, 404)
      expect(body.error).toBe('Import job not found')
    })

    test('handles job retrieval errors', async () => {
      // Mock queue error
      mockQueueGetJob.mockRejectedValue(new Error('Queue connection failed'))

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/job-123',
      })

      const body = await assertErrorResponse(response, 500)
      expect(body.error).toBe('Failed to retrieve job status')
      expect(body.details).toBe('Queue connection failed')
    })
  })

  describe('GET /api/finance/import/active', () => {
    test('returns active jobs for user', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          finishedOn: null,
          failedReason: null,
          progress: 30,
          data: { userId: 'test-user-id', fileName: 'file1.csv' },
        },
        {
          id: 'job-2',
          finishedOn: null,
          failedReason: null,
          progress: 70,
          data: { userId: 'test-user-id', fileName: 'file2.csv' },
        },
        {
          id: 'job-3',
          finishedOn: null,
          failedReason: null,
          progress: 10,
          data: { userId: 'other-user-id', fileName: 'file3.csv' },
        },
      ]
      mockQueueGetJobs.mockResolvedValue(mockJobs)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/active',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.jobs).toHaveLength(2) // Only user's jobs
      expect(body.jobs?.[0].jobId).toBe('job-1')
      expect(body.jobs?.[0].userId).toBe('test-user-id')
      expect(body.jobs?.[0].fileName).toBe('file1.csv')
      expect(body.jobs?.[0].status).toBe('processing')
      expect(body.jobs?.[0].progress).toBe(30)
    })

    test('returns empty array when no active jobs', async () => {
      mockQueueGetJobs.mockResolvedValue([])

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/active',
      })

      const body = await assertSuccessResponse<ImportApiResponse>(response)
      expect(body.jobs).toEqual([])
    })

    test('handles queue errors', async () => {
      mockQueueGetJobs.mockRejectedValue(new Error('Queue connection failed'))

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: '/api/finance/import/active',
      })

      const body = await assertErrorResponse(response, 500)
      expect(body.error).toBe('Failed to retrieve active import jobs')
      expect(body.details).toBe('Queue connection failed')
    })
  })
})
