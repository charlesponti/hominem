import type { BoltExport } from '@ponti/utils/services'
import fs from 'node:fs'
import { expect, vi, type Mock } from 'vitest'

export function mockFileSystem(inputData: unknown) {
  const mockData = JSON.stringify(inputData)
  vi.mocked(fs.readFileSync).mockReturnValue(mockData)
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)
}

export function getWrittenBoltData(): BoltExport {
  const writeCalls = vi.mocked(fs.writeFileSync).mock.calls
  expect(writeCalls.length).toBeGreaterThan(0)
  return JSON.parse(writeCalls[0][1] as string)
}

export function setupFsMock() {
  return vi.mock('node:fs', () => {
    const actual = vi.importActual('node:fs') as object
    return {
      ...actual,
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      default: {
        ...actual,
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
      },
    }
  })
}
