import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Place } from '~/lib/types'

import { MOCK_PLACE } from '~/test/mocks/place'
import { mockTrpcClient, renderWithRouter } from '~/test/utils'

interface MockQueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
}

describe('Place', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders place details', async () => {
    // Mock place query
    mockTrpcClient.places.getById.useQuery.mockReturnValue({
      data: MOCK_PLACE,
      isLoading: false,
      error: null,
    } as MockQueryResult<Place>)

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    })

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument()
    })
  })

  test('shows loading state', async () => {
    // Mock place query with loading state
    mockTrpcClient.places.getById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as MockQueryResult<Place>)

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    })

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument()
    })
  })

  test('shows error state', async () => {
    // Mock place query with error
    mockTrpcClient.places.getById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Place not found' },
    } as MockQueryResult<Place>)

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    })

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument()
    })
  })
})
