import { screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, test } from 'vitest'

import NotFound from '../routes/NotFound.svelte'
import { renderWithStores, mockNavigate } from './utils'

describe('NotFound', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  test('renders the not found page correctly', () => {
    renderWithStores(NotFound)

    // Check for not found message
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()

    // Check for return to home link
    expect(screen.getByText(/return to home/i)).toBeInTheDocument()
  })

  test('navigates to home when link is clicked', async () => {
    renderWithStores(NotFound)

    // Click the return home link
    const homeLink = screen.getByText(/return to home/i)
    homeLink.click()

    // Verify navigation was called with home path
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
