// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockPost = vi.fn();

vi.mock('@hominem/rpc/react', () => ({
  useApiClient: () => ({
    api: {
      tasks: {
        parse: {
          $post: mockPost,
        },
      },
    },
  }),
}));

const { useTimeBlockParse } = await import('~/services/tasks/use-time-block-parse');

describe('useTimeBlockParse', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends the transcript with a resolved timezone and reference date', async () => {
    mockPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blocks: [] }),
    });
    const { result } = renderHookWithQueryClient(() => useTimeBlockParse());

    await act(async () => {
      await result.current.mutateAsync({ transcript: 'lunch at noon' });
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [{ json }] = mockPost.mock.calls[0];
    expect(json).toEqual(
      expect.objectContaining({
        transcript: 'lunch at noon',
        timezone: expect.any(String),
        referenceDate: expect.any(String),
      }),
    );
  });

  it('throws the server-provided error message when the response is not ok', async () => {
    mockPost.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Could not parse transcript' }),
    });
    const { result } = renderHookWithQueryClient(() => useTimeBlockParse());

    await act(async () => {
      await expect(result.current.mutateAsync({ transcript: 'gibberish' })).rejects.toThrow(
        'Could not parse transcript',
      );
    });
  });

  it('falls back to a status-coded error when the response has no error body', async () => {
    mockPost.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    const { result } = renderHookWithQueryClient(() => useTimeBlockParse());

    await act(async () => {
      await expect(result.current.mutateAsync({ transcript: 'gibberish' })).rejects.toThrow(
        'Time block parsing failed (500)',
      );
    });
  });
});
