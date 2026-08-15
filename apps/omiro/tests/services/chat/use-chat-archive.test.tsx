// @vitest-environment jsdom
import { waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { inboxEntityKeys } from '~/services/inbox/inbox-entities';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { renderHookWithQueryClient } from '../../utils/render-hook';

const mockArchivePost = vi.fn();
const mockReadResumeTarget = vi.fn();
const mockClearResumeTarget = vi.fn();

vi.mock('@hominem/rpc/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hominem/rpc/react')>();
  return {
    ...actual,
    useApiClient: () => ({
      api: {
        chats: {
          ':id': {
            archive: {
              $post: mockArchivePost,
            },
          },
        },
      },
    }),
  };
});

vi.mock('~/services/navigation/launch-state', () => ({
  readResumeTarget: mockReadResumeTarget,
  clearResumeTarget: mockClearResumeTarget,
}));

const { useChatArchive } = await import('~/services/chat/use-chat-archive');

const CHAT_ID = 'chat-1';

function seedInboxPage(queryClient: ReturnType<typeof renderHookWithQueryClient>['queryClient']) {
  queryClient.setQueryData(inboxKeys.pages(), {
    pages: [{ itemIds: [`chat:${CHAT_ID}`], nextCursor: null }],
    pageParams: [null],
  });
  queryClient.setQueryData(inboxEntityKeys.all, {
    [`chat:${CHAT_ID}`]: {
      id: `chat:${CHAT_ID}`,
      entityId: CHAT_ID,
      kind: 'chat',
      title: 'A chat',
      preview: null,
      updatedAt: new Date().toISOString(),
      route: '/(protected)/inbox/chat/chat-1',
      variant: 'conversation',
    },
  });
}

describe('useChatArchive', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('removes the chat from cached inbox pages optimistically', async () => {
    mockReadResumeTarget.mockReturnValue(null);
    mockArchivePost.mockImplementation(
      () => new Promise(() => {}), // never resolves, to inspect the optimistic state
    );
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useChatArchive({ chatId: CHAT_ID }),
    );
    seedInboxPage(queryClient);

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{ pages: { itemIds: string[] }[] }>(inboxKeys.pages());
      expect(data?.pages[0]?.itemIds).toEqual([]);
    });
  });

  it('restores the previous inbox pages when the archive request fails', async () => {
    mockReadResumeTarget.mockReturnValue(null);
    mockArchivePost.mockRejectedValueOnce(new Error('network error'));
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useChatArchive({ chatId: CHAT_ID }),
    );
    seedInboxPage(queryClient);

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    const data = queryClient.getQueryData<{ pages: { itemIds: string[] }[] }>(inboxKeys.pages());
    expect(data?.pages[0]?.itemIds).toEqual([`chat:${CHAT_ID}`]);
  });

  it('updates the active chat cache, prepends the archived id, and calls onSuccess', async () => {
    mockReadResumeTarget.mockReturnValue(null);
    const archivedChat = { id: CHAT_ID, archivedAt: new Date().toISOString() };
    mockArchivePost.mockResolvedValueOnce({ json: async () => archivedChat });
    const onSuccess = vi.fn();
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useChatArchive({ chatId: CHAT_ID, onSuccess }),
    );
    queryClient.setQueryData(chatKeys.archivedChats, ['other-chat']);

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryData(chatKeys.activeChat(CHAT_ID))).toEqual(archivedChat);
    expect(queryClient.getQueryData(chatKeys.archivedChats)).toEqual(['chat-1', 'other-chat']);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('clears the resume target when it points at the archived chat', async () => {
    mockReadResumeTarget.mockReturnValue({
      kind: 'chat',
      id: CHAT_ID,
      title: null,
      updatedAt: null,
    });
    mockArchivePost.mockResolvedValueOnce({ json: async () => ({ id: CHAT_ID }) });
    const { result } = renderHookWithQueryClient(() => useChatArchive({ chatId: CHAT_ID }));

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockClearResumeTarget).toHaveBeenCalledTimes(1);
  });

  it('does not clear the resume target when it points elsewhere', async () => {
    mockReadResumeTarget.mockReturnValue({
      kind: 'chat',
      id: 'other-chat',
      title: null,
      updatedAt: null,
    });
    mockArchivePost.mockResolvedValueOnce({ json: async () => ({ id: CHAT_ID }) });
    const { result } = renderHookWithQueryClient(() => useChatArchive({ chatId: CHAT_ID }));

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockClearResumeTarget).not.toHaveBeenCalled();
  });
});
