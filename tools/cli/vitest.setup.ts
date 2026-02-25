import { vi } from 'vitest'


// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

export const existsSyncMock = vi.fn(() => true)
export const readFileSyncMock = vi.fn(() => '{}')
export const writeFileSyncMock = vi.fn()
export const createWriteStreamMock = vi.fn()

vi.mock('node:fs', () => {
  return {
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock,
    createWriteStream: createWriteStreamMock,
    default: {
      existsSync: existsSyncMock,
      readFileSync: readFileSyncMock,
      writeFileSync: writeFileSyncMock,
      createWriteStream: createWriteStreamMock,
    },
  }
})
