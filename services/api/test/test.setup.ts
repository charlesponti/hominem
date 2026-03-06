import { afterAll, beforeAll, vi } from 'vitest'

// ESM interop fix for Zod in Vitest/Bun
vi.mock('zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>()
  const z = actual.z || actual
  return {
    ...actual,
    z,
    default: z,
  }
})

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Mock R2 environment variables for tests
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'
process.env.R2_ACCESS_KEY_ID = 'test-access-key-id'
process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key'
process.env.R2_BUCKET_NAME = 'test-bucket'
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_key'
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@hominem.test'
process.env.RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'Hominem Test'
process.env.SEND_EMAILS = process.env.SEND_EMAILS || 'false'
process.env.AUTH_TEST_OTP_ENABLED = process.env.AUTH_TEST_OTP_ENABLED || 'true'
process.env.AUTH_E2E_SECRET = process.env.AUTH_E2E_SECRET || 'otp-secret'

// Redis is running in Docker for tests - no mocking needed

// Mock R2 storage service
vi.mock('@hominem/utils/storage', () => ({
  csvStorageService: {
    uploadCsvFile: vi.fn().mockResolvedValue('test/path/file.csv'),
    downloadCsvFile: vi.fn().mockResolvedValue('test,data\n'),
    downloadCsvFileAsBuffer: vi.fn().mockResolvedValue(Buffer.from('test,data\n')),
  },
  fileStorageService: {
    storeFile: vi.fn().mockResolvedValue({
      id: 'test-id',
      originalName: 'test.txt',
      filename: 'test-id.txt',
      mimetype: 'text/plain',
      size: 100,
      url: 'https://test.r2.cloudflarestorage.com/test/test-id.txt',
      uploadedAt: new Date(),
    }),
    getFile: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    deleteFile: vi.fn().mockResolvedValue(true),
    getFileUrl: vi.fn().mockResolvedValue('https://test.r2.cloudflarestorage.com/test/file.txt'),
    listUserFiles: vi.fn().mockResolvedValue([]),
  },
  placeImagesStorageService: {
    storeFile: vi.fn().mockResolvedValue({
      id: 'test-id',
      originalName: 'test.webp',
      filename: 'places/place/test/test-id.webp',
      mimetype: 'image/webp',
      size: 100,
      url: 'https://test.r2.cloudflarestorage.com/test/test-id.webp',
      uploadedAt: new Date(),
    }),
  },
}))

vi.mock('resend', () => {
  const send = vi.fn()
  return {
    Resend: vi.fn(() => ({
      emails: { send },
    })),
  }
})

vi.mock('../src/analytics', () => ({
  track: vi.fn(),
  EVENTS: {
    USER_EVENTS: {},
  },
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(),
    },
    options: vi.fn(),
    places: vi.fn(() => ({
      places: {
        get: vi.fn(),
        photos: {
          getMedia: vi.fn(),
        },
        searchText: vi.fn(),
      },
    })),
  },
}))

// Global test setup - no longer seeding finance test data globally
beforeAll(async () => {
  // Any global setup can go here
})

// Global test cleanup - no longer cleaning up finance test data globally
afterAll(async () => {
  // Any global cleanup can go here
})
