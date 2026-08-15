// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockGet = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        notes: {
          ':id': {
            $get: mockGet,
          },
        },
      },
    }),
  };
});

const { useNoteQuery } = await import('~/services/notes/use-note-query');

afterEach(() => {
  vi.clearAllMocks();
});

describe('useNoteQuery', () => {
  it('fetches the note and reports it as usable data once loaded', async () => {
    mockGet.mockResolvedValueOnce({ json: async () => ({ id: 'note-1', content: 'Hello' }) });

    const { result } = renderHookWithQueryClient(() => useNoteQuery({ noteId: 'note-1' }));

    expect(result.current.isInitialLoading).toBe(true);

    await waitFor(() => expect(result.current.hasUsableData).toBe(true));

    expect(mockGet).toHaveBeenCalledWith({ param: { id: 'note-1' } });
    expect(result.current.data).toEqual({ id: 'note-1', content: 'Hello' });
    expect(result.current.isInitialLoading).toBe(false);
  });

  it('does not fetch when disabled', () => {
    renderHookWithQueryClient(() => useNoteQuery({ noteId: 'note-1', enabled: false }));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not fetch when the noteId is empty', () => {
    renderHookWithQueryClient(() => useNoteQuery({ noteId: '' }));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('surfaces query errors', async () => {
    mockGet.mockRejectedValueOnce(new Error('not found'));

    const { result } = renderHookWithQueryClient(() => useNoteQuery({ noteId: 'missing' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.hasUsableData).toBe(false);
  });
});
