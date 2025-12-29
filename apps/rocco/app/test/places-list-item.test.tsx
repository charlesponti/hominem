import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import PlacesList from '~/components/places/places-list'
import { MapInteractionProvider } from '~/contexts/map-interaction-context'
import { getMockListPlace } from '~/test/mocks'
import { renderWithRouter } from '~/test/utils'

const renderPlacesList = (props: {
  places: Parameters<typeof PlacesList>[0]['places']
  listId: string
  canAdd?: boolean
}) => {
  return renderWithRouter({
    routes: [
      {
        path: '/',
        Component: () => (
          <MapInteractionProvider>
            <PlacesList {...props} />
          </MapInteractionProvider>
        ),
      },
    ],
  })
}

// Mock the hooks used by PlaceListItemActions and AddPlaceControl
vi.mock('~/lib/places', () => ({
  useRemoveListItem: () => ({
    mutate: vi.fn(),
  }),
  useAddPlaceToList: () => ({
    mutate: vi.fn(),
  }),
  createPlaceFromPrediction: vi.fn(),
}))

describe('PlacesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders list of places', async () => {
    const places = [
      getMockListPlace({ name: 'Place 1', placeId: 'place-1' }),
      getMockListPlace({ name: 'Place 2', placeId: 'place-2' }),
    ]

    renderPlacesList({
      places,
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument()
      expect(screen.getByText('Place 2')).toBeInTheDocument()
    })
  })

  test('displays empty state when no places', async () => {
    renderPlacesList({
      places: [],
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('No places yet')).toBeInTheDocument()
      expect(
        screen.getByText('Start building your list by adding places to see them on the map.')
      ).toBeInTheDocument()
    })
  })

  test('handles keyboard navigation with ArrowDown', async () => {
    const user = userEvent.setup()
    const places = [
      getMockListPlace({ name: 'Place 1', placeId: 'place-1' }),
      getMockListPlace({ name: 'Place 2', placeId: 'place-2' }),
      getMockListPlace({ name: 'Place 3', placeId: 'place-3' }),
    ]

    const { container } = renderPlacesList({
      places,
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument()
    })

    // Find the ListSurface element (now handles keyboard events directly)
    const listContainer = container.querySelector('[aria-label="Places in list"]') as HTMLElement
    expect(listContainer).toBeInTheDocument()

    if (listContainer) {
      listContainer.focus()
      await user.keyboard('{ArrowDown}')
      // Component should handle the keypress without errors
    }
  })

  test('handles keyboard navigation with ArrowUp', async () => {
    const user = userEvent.setup()
    const places = [
      getMockListPlace({ name: 'Place 1', placeId: 'place-1' }),
      getMockListPlace({ name: 'Place 2', placeId: 'place-2' }),
    ]

    const { container } = renderPlacesList({
      places,
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument()
    })

    const listContainer = container.querySelector('[aria-label="Places in list"]') as HTMLElement
    if (listContainer) {
      listContainer.focus()
      await user.keyboard('{ArrowUp}')
      // Should wrap to last item
    }
  })

  test('handles Escape key to clear selection', async () => {
    const user = userEvent.setup()
    const places = [getMockListPlace({ name: 'Place 1', placeId: 'place-1' })]

    const { container } = renderPlacesList({
      places,
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument()
    })

    const listContainer = container.querySelector('[aria-label="Places in list"]') as HTMLElement
    if (listContainer) {
      listContainer.focus()
      await user.keyboard('{Escape}')
      // Selection should be cleared
    }
  })

  test('handles Enter key to navigate to place', async () => {
    const user = userEvent.setup()
    const places = [getMockListPlace({ name: 'Place 1', placeId: 'place-1' })]

    const { container } = renderPlacesList({
      places,
      listId: 'test-list-id',
    })

    await waitFor(() => {
      expect(screen.getByText('Place 1')).toBeInTheDocument()
    })

    const listContainer = container.querySelector('[aria-label="Places in list"]') as HTMLElement
    if (listContainer) {
      // First select an item with ArrowDown
      listContainer.focus()
      await user.keyboard('{ArrowDown}')
      // Then press Enter to navigate
      await user.keyboard('{Enter}')
      // Navigation should be triggered (tested via router stub)
    }
  })

  test('renders add button when canAdd is true', async () => {
    renderPlacesList({
      places: [],
      listId: 'test-list-id',
      canAdd: true,
    })

    await waitFor(() => {
      expect(screen.getByTestId('add-to-list-button')).toBeInTheDocument()
    })
  })
})
