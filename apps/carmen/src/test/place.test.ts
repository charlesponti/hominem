import { beforeEach, describe, expect, test } from 'vitest'

import Place from '../routes/Place.svelte'
import { renderWithStores, mockNavigate, setupAuth } from './utils'

// Note: PLACE_ID is actually used by the mock in test.setup.tsx but not needed here

describe('Place', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    setupAuth(false)
  })

  test('redirects to login when user is not authenticated', () => {
    renderWithStores(Place)

    // Verify navigation was called with login path
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
