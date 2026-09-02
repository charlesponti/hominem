import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatsUpdateInput } from '@hominem/rpc/types/chat.types';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatQueryKeys } from '~/lib/query-keys';

export function useChatsList() {
  const client = useApiClient();

  return useQuery({
    queryKey: chatQueryKeys.list,
    staleTime: 1000 * 30,
    queryFn: () =>
      client.api.chats.$get({ query: { limit: '100' } }).then(async (response) => {
        const page = await response.json();
        return page.items;
      }),
  });
}

export function useChatLastMessages(chatIds: string[]) {
  const client = useApiClient();

  return useQueries({
    queries: chatIds.map((chatId) => ({
      queryKey: [...chatQueryKeys.messages(chatId), 'latest'],
      queryFn: () =>
        client.api.chats[':id'].messages
          .$get({ param: { id: chatId }, query: { limit: '1' } })
          .then((response) => response.json()),
      staleTime: 1000 * 30,
    })),
  });
}

export function useCreateChat() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { title: string }) =>
      client.api.chats
        .$post({ json: { title: variables.title } })
        .then((r) => r.json() as Promise<Chat>),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
    },
  });
}

export function useUpdateChatTitle() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { chatId: string; title: string },
    { previousChats?: Chat[]; previousSidebar?: Chat[] }
  >({
    mutationFn: async ({ chatId, title }) => {
      await client.api.chats[':id'].$patch({
        param: { id: chatId },
        json: { title } satisfies ChatsUpdateInput,
      });
    },
    onMutate: async ({ chatId, title }) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.list });
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.sidebarList });
      const previousChats = queryClient.getQueryData<Chat[]>(chatQueryKeys.list);
      const previousSidebar = queryClient.getQueryData<Chat[]>(chatQueryKeys.sidebarList);
      queryClient.setQueryData<Chat[]>(chatQueryKeys.list, (chats) =>
        chats?.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
      );
      queryClient.setQueryData<Chat[]>(chatQueryKeys.sidebarList, (chats) =>
        chats?.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
      );
      return { previousChats, previousSidebar };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatQueryKeys.list, context.previousChats);
      }
      if (context?.previousSidebar) {
        queryClient.setQueryData(chatQueryKeys.sidebarList, context.previousSidebar);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebarList });
    },
  });
}

export function useArchiveChat({
  chatId: _chatId,
  onSuccess,
}: {
  chatId?: string;
  onSuccess?: (chat: Chat) => void;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    onMutate: async ({ chatId }) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.list });
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.sidebarList });
      const previousChats = queryClient.getQueryData<Chat[]>(chatQueryKeys.list);
      const previousSidebar = queryClient.getQueryData<Chat[]>(chatQueryKeys.sidebarList);
      queryClient.setQueryData<Chat[]>(chatQueryKeys.list, (chats) =>
        chats?.filter((chat) => chat.id !== chatId),
      );
      queryClient.setQueryData<Chat[]>(chatQueryKeys.sidebarList, (chats) =>
        chats?.filter((chat) => chat.id !== chatId),
      );
      return { previousChats, previousSidebar };
    },
    mutationFn: (variables: { chatId: string }) =>
      client.api.chats[':id'].archive
        .$post({ param: { id: variables.chatId } })
        .then((r) => r.json() as Promise<Chat>),
    onError: (_error, _variables, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatQueryKeys.list, context.previousChats);
      }
      if (context?.previousSidebar) {
        queryClient.setQueryData(chatQueryKeys.sidebarList, context.previousSidebar);
      }
    },
    onSuccess: (chat) => {
      onSuccess?.(chat);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebarList });
    },
  });
}
