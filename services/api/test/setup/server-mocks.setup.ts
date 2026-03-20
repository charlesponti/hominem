import { vi } from 'vitest'

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