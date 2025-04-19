import { beforeEach, describe, expect, test } from 'vitest'

import List from '../routes/List.svelte'
import { renderWithStores, setupStores, mockNavigate } from './utils'

describe('List', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  test('redirects to login when user is not authenticated', () => {
    // Set up unauthenticated state
    setupStores({ isAuthenticated: false })

    renderWithStores(List)

    // Verify navigation was called with login path
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
