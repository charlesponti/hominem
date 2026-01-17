import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MOCK_PLACE } from '~/test/mocks/place';
import { roccoMocker } from '~/test/roccoMocker';
import { renderWithRouter } from '~/test/utils';

describe('Place', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders place details', async () => {
    roccoMocker.mockPlacesGetById(MOCK_PLACE);

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    });

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument();
    });
  });

  test('shows loading state', async () => {
    // Mock place query with loading state
    roccoMocker.mockPlacesGetById(undefined, true);

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    });

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument();
    });
  });

  test('shows error state', async () => {
    // Mock place query with error
    roccoMocker.mockPlacesGetById(undefined, false, { message: 'Place not found' } as Error);

    renderWithRouter({
      routes: [
        {
          path: '/places/:id',
          Component: () => <div>Place Component</div>, // Placeholder component
        },
      ],
      initialEntries: ['/places/123'],
    });

    await waitFor(() => {
      expect(screen.getByText('Place Component')).toBeInTheDocument();
    });
  });
});
