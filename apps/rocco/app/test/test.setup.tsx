import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import './utils'

export const TEST_LIST_ID = 'list-id'

// Reset mocks after each test for test isolation
afterEach(() => {
  vi.resetAllMocks()
  cleanup()
})
