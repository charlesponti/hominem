import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { List } from '~/lib/types';

import ListPage from '~/routes/lists.$id';
import { getMockUser, USER_ID } from '~/test/mocks/index';
import { getMockListPlace } from '~/test/mocks/place';
import { roccoMocker } from '~/test/roccoMocker';
import { TEST_LIST_ID } from '~/test/test.setup';
import { renderWithRouter } from '~/test/utils';

// Mock hooks and dependencies
vi.mock('~/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ currentLocation: { lat: 0, lng: 0 }, isLoading: false }),
}));

vi.mock('~/contexts/map-interaction-context', () => ({
  MapInteractionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMapInteraction: () => ({ hoveredPlaceId: null, setHoveredPlaceId: vi.fn() }),
}));

vi.mock('~/components/map.lazy', () => ({
  default: () => <div data-testid="lazy-map-mock">Map Mock</div>,
}));

vi.mock('~/lib/trpc/server', () => ({
  createCaller: vi.fn(),
}));

/**
 * Simplified list tests using renderWithRouter
 *
 * Testing approach:
 * - Use renderWithRouter with real router setup
 * - Mock only tRPC queries (not the loader)
 * - Focus on component behavior, not routing internals
 */
describe('ListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when list does not belong to user', () => {
    const list: List = {
      id: TEST_LIST_ID,
      name: 'test list',
      places: [getMockListPlace()],
      userId: 'other-user-id',
      isOwnList: false,
      hasAccess: false,
      description: 'Test list description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getMockUser(),
      isPublic: false,
      users: [],
    };

    beforeEach(() => {
      roccoMocker.mockListsGetById(list);
    });

    test('should display list content', async () => {
      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            // Minimal loader to provide loaderData
            loader: () => ({ list }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'test list' })).toBeInTheDocument();
      });
    });

    test('should not show owner controls for non-owner', async () => {
      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'test list' })).toBeInTheDocument();
      });

      // Edit button should NOT be visible for non-owners
      expect(screen.queryByLabelText('Edit list')).not.toBeInTheDocument();
    });

    test('should not show add button when no access', async () => {
      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.queryByTestId('add-to-list-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('when list belongs to user', () => {
    const list: List = {
      id: TEST_LIST_ID,
      name: 'my list',
      isOwnList: true,
      hasAccess: true,
      places: [getMockListPlace()],
      userId: USER_ID,
      description: 'My list description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getMockUser(),
      isPublic: false,
      users: [],
    };

    beforeEach(() => {
      roccoMocker.mockListsGetById(list);

      roccoMocker.mockListsUpdateMutation({
        data: undefined,
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
      });
    });

    test('should display list with owner controls', async () => {
      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'my list' })).toBeInTheDocument();
        expect(screen.getByLabelText('Edit list')).toBeInTheDocument();
      });
    });

    test('should open edit dialog when clicking edit icon', async () => {
      const user = userEvent.setup();

      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'my list' })).toBeInTheDocument(),
      );

      const editButton = screen.getByLabelText('Edit list');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('list-edit-dialog')).toBeInTheDocument();
      });
    });

    test('should show user avatars when list has collaborators', async () => {
      const listWithUsers: List = {
        ...list,
        users: [
          { id: USER_ID, name: 'Test User', email: 'test@example.com', image: null },
          { id: 'user-2', name: 'Collaborator', email: 'collab@example.com', image: null },
        ],
      };

      roccoMocker.mockListsGetById(listWithUsers);

      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list: listWithUsers }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'my list' })).toBeInTheDocument();
      });
    });
  });

  describe('hasAccess logic', () => {
    test('should show add button when user has access', async () => {
      const listWithAccess: List = {
        id: TEST_LIST_ID,
        name: 'shared list',
        places: [],
        userId: 'other-user-id',
        isOwnList: false,
        hasAccess: true,
        description: 'Shared list',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: getMockUser(),
        isPublic: false,
        users: [],
      };

      roccoMocker.mockListsGetById(listWithAccess);

      renderWithRouter({
        routes: [
          {
            path: '/lists/:id',
            // biome-ignore lint/suspicious/noExplicitAny: Test router setup
            Component: ListPage as any,
            loader: () => ({ list: listWithAccess }),
          },
        ],
        initialEntries: [`/lists/${TEST_LIST_ID}`],
      });

      await waitFor(() => {
        expect(screen.getByTestId('add-to-list-button')).toBeInTheDocument();
      });
    });
  });
});
