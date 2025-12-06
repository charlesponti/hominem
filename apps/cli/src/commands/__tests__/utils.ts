import fs from 'node:fs'
import type { BoltExport } from '@hominem/data/services'
import { expect, vi } from 'vitest'

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
