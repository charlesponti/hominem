import { vi } from 'vitest'
import { validTypingMindInput } from './src/commands/__tests__/typingmind.mock.js'

export const existsSyncMock = vi.fn(() => true)
export const readFileSyncMock = vi.fn(() => JSON.stringify(validTypingMindInput))
export const writeFileSyncMock = vi.fn()
export const createWriteStreamMock = vi.fn()

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock,
    createWriteStream: createWriteStreamMock,
    default: {
      ...actual,
      existsSync: existsSyncMock,
      readFileSync: readFileSyncMock,
      writeFileSync: writeFileSyncMock,
      createWriteStream: createWriteStreamMock,
    },
  }
})
