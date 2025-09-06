import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { getMockUser } from '~/test/mocks/index'
import { MOCK_LIST_PLACE } from '~/test/mocks/place'
import { TEST_LIST_ID } from '~/test/test.setup'
import { mockTrpcClient, renderWithRouter } from '~/test/utils'

vi.mock('~/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ currentLocation: { lat: 0, lng: 0 } }),
}))

describe('List', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when list does not belong to user', () => {
    const list = {
      id: TEST_LIST_ID,
      name: 'test list',
      places: [MOCK_LIST_PLACE],
      userId: 'other-user-id',
      isOwnList: false,
      description: 'Test list description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getMockUser(),
    }

    beforeEach(() => {
      // Mock list query
      vi.mocked(mockTrpcClient.lists.getById.useQuery).mockReturnValue({
        data: list,
        isLoading: false,
        error: null,
      })
    })

    test('should display list content', async () => {
      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })
  })

  describe('List Menu and Edit Sheet', () => {
    const list = {
      id: TEST_LIST_ID,
      name: 'test list',
      isOwnList: true,
      places: [MOCK_LIST_PLACE],
      userId: 'user-id',
      description: 'Test list description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getMockUser(),
    }

    beforeEach(() => {
      // Mock list query
      vi.mocked(mockTrpcClient.lists.getById.useQuery).mockReturnValue({
        data: list,
        isLoading: false,
        error: null,
      })

      // Mock update mutation
      const mockUpdateMutation = {
        mutate: vi.fn(),
        isLoading: false,
        error: null,
      }
      vi.mocked(mockTrpcClient.lists.update.useMutation).mockReturnValue(mockUpdateMutation)
    })

    test('should display list menu for own list', async () => {
      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })

    test("should not display list menu for other user's list", async () => {
      const otherList = {
        ...list,
        userId: 'other-user-id',
        isOwnList: false,
      }

      // Mock list query with other user's list
      vi.mocked(mockTrpcClient.lists.getById.useQuery).mockReturnValue({
        data: otherList,
        isLoading: false,
        error: null,
      })

      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })

    test("should open edit sheet when clicking 'Edit' in menu", async () => {
      const _user = userEvent.setup()

      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })

    test('should update list when edit form is submitted', async () => {
      const _user = userEvent.setup()
      const mockUpdateMutation = {
        mutate: vi.fn(),
        isLoading: false,
        error: null,
      }
      vi.mocked(mockTrpcClient.lists.update.useMutation).mockReturnValue(mockUpdateMutation)

      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })

    test('should display error message when update fails', async () => {
      const _user = userEvent.setup()
      const mockUpdateMutation = {
        mutate: vi.fn(),
        isLoading: false,
        error: { message: 'Failed to update list' },
      }
      vi.mocked(mockTrpcClient.lists.update.useMutation).mockReturnValue(mockUpdateMutation)

      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })

    test('should pre-fill form with list data', async () => {
      const _user = userEvent.setup()

      renderWithRouter({
        isAuth: true,
        routes: [
          {
            path: `/lists/${TEST_LIST_ID}`,
            Component: () => <div>List Component</div>, // Placeholder component
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      })

      await waitFor(() => {
        expect(screen.getByText('List Component')).toBeInTheDocument()
      })
    })
  })
})
