// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockChatsPost = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          $post: mockChatsPost,
        },
      },
    }),
  };
});

const { useCreateChat } = await import('~/services/chat/use-create-chat');

describe('useCreateChat', () => {
  it('posts the title and seeds the active chat cache on success', async () => {
    const chat = { id: 'new-chat', title: 'My chat' };
    mockChatsPost.mockResolvedValueOnce({ json: async () => chat });
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateChat());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({ title: 'My chat' });
    });

    expect(mockChatsPost).toHaveBeenCalledWith({ json: { title: 'My chat' } });
    expect(queryClient.getQueryData(chatKeys.activeChat('new-chat'))).toEqual(chat);
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: inboxKeys.pages() }),
    );
  });

  it('surfaces the mutation error and leaves the cache untouched on failure', async () => {
    mockChatsPost.mockRejectedValueOnce(new Error('server error'));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateChat());

    await act(async () => {
      await expect(result.current.mutateAsync({ title: 'My chat' })).rejects.toThrow(
        'server error',
      );
    });

    expect(queryClient.getQueryData(chatKeys.activeChat('new-chat'))).toBeUndefined();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
