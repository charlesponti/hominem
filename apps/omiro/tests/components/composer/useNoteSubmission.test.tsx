// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockMutateAsync = vi.fn();
const mockInvalidateInboxQueries = vi.fn().mockResolvedValue(undefined);
const mockDonateAddNoteIntent = vi.fn();

let mockIsPending = false;

vi.mock('~/services/notes/use-create-note', () => ({
  useCreateNote: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

vi.mock('~/services/inbox/inbox-refresh', () => ({
  invalidateInboxQueries: mockInvalidateInboxQueries,
}));

vi.mock('~/services/intent-donation', () => ({
  donateAddNoteIntent: mockDonateAddNoteIntent,
}));

const { useNoteSubmission } = await import('~/components/composer/useNoteSubmission');

describe('useNoteSubmission', () => {
  beforeEach(() => {
    mockIsPending = false;
    mockMutateAsync.mockResolvedValue({ id: 'note-1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates the note, donates the intent, refreshes the inbox, and clears the composer in order', async () => {
    const { result } = renderHookWithQueryClient(() => useNoteSubmission());
    const clearComposer = vi.fn();
    const callOrder: string[] = [];

    mockMutateAsync.mockImplementation(async () => {
      callOrder.push('createNote');
      return { id: 'note-1' };
    });
    mockDonateAddNoteIntent.mockImplementation(() => callOrder.push('donate'));
    mockInvalidateInboxQueries.mockImplementation(async () => {
      callOrder.push('invalidate');
    });
    clearComposer.mockImplementation(() => callOrder.push('clear'));

    await act(async () => {
      await result.current.submitNote({
        clearComposer,
        fileIds: ['file-1'],
        message: '  hello world  ',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ text: 'hello world', fileIds: ['file-1'] });
    expect(callOrder).toEqual(['createNote', 'donate', 'invalidate', 'clear']);
  });

  it('does not submit while a save is already in flight', async () => {
    mockIsPending = true;
    const { result } = renderHookWithQueryClient(() => useNoteSubmission());
    const clearComposer = vi.fn();

    await act(async () => {
      await result.current.submitNote({ clearComposer, fileIds: [], message: 'hi' });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockDonateAddNoteIntent).not.toHaveBeenCalled();
    expect(mockInvalidateInboxQueries).not.toHaveBeenCalled();
    expect(clearComposer).not.toHaveBeenCalled();
  });

  it('propagates the error and skips donation/refresh/clear when note creation fails', async () => {
    const { result } = renderHookWithQueryClient(() => useNoteSubmission());
    const clearComposer = vi.fn();
    mockMutateAsync.mockRejectedValue(new Error('network down'));

    await expect(
      result.current.submitNote({ clearComposer, fileIds: [], message: 'hi' }),
    ).rejects.toThrow('network down');

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockDonateAddNoteIntent).not.toHaveBeenCalled();
    expect(mockInvalidateInboxQueries).not.toHaveBeenCalled();
    expect(clearComposer).not.toHaveBeenCalled();
  });

  it('exposes isSaving from the underlying mutation', () => {
    mockIsPending = true;
    const { result } = renderHookWithQueryClient(() => useNoteSubmission());
    expect(result.current.isSaving).toBe(true);
  });
});
