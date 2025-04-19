import { beforeEach, describe, expect, test } from 'vitest'

import Dashboard from '../routes/Dashboard.svelte'
import { renderWithStores, setupStores, mockNavigate } from './utils'

// Mock only one test at a time to avoid issues with how svelte-testing-library works
describe('Dashboard', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  test('redirects to login when user is not authenticated', async () => {
    // Set up unauthenticated state
    setupStores({ isAuthenticated: false })

    renderWithStores(Dashboard)

    // Verify navigation was called with login path
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
