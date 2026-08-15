// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockGet = vi.fn();

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    api: {
      usage: {
        monthly: {
          $get: mockGet,
        },
      },
    },
  }),
}));

const { useMonthlyUsage } = await import('~/services/usage/use-usage-query');

describe('useMonthlyUsage', () => {
  it('fetches and returns the monthly usage status', async () => {
    mockGet.mockResolvedValueOnce({ json: async () => ({ used: 3, limit: 10 }) });

    const { result } = renderHookWithQueryClient(() => useMonthlyUsage());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ used: 3, limit: 10 });
  });

  it('surfaces an error when the request fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('server error'));

    const { result } = renderHookWithQueryClient(() => useMonthlyUsage());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
