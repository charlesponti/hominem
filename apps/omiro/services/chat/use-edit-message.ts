import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '~/services/notes/query-keys';

import type { MessageOutput } from './chatMessages';

interface EditMessageInput {
  messageId: string;
  content: string;
}

export function useEditChatMessage(chatId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    EditMessageInput,
    { previousMessages: MessageOutput[] | undefined }
  >({
    mutationFn: async ({ messageId, content }) => {
      const res = await client.api.chats[':id'].messages[':messageId'].$patch({
        param: { id: chatId, messageId },
        json: { content },
      });
      return res.json();
    },
    onMutate: async ({ messageId, content }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const previousMessages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId));

      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (prev) =>
        prev?.map((m) => (m.id === messageId ? { ...m, message: content } : m)),
      );

      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(chatId), context.previousMessages);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
    },
  });
}
