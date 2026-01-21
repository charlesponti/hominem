import type { createServerTRPCClient } from '~/lib/trpc/server';

import { ChatCreationError } from './errors';

type TRPCClient = ReturnType<typeof createServerTRPCClient>;

/**
 * Gets the first existing chat or creates a new one
 * Returns the chat ID
 */
export async function getOrCreateChat(trpcClient: TRPCClient): Promise<{ chatId: string }> {
  const [chat] = await trpcClient.chats.getUserChats.query({
    limit: 1,
  });

  if (chat) {
    return { chatId: chat.id };
  }

  const newChat = await trpcClient.chats.createChat.mutate({
    title: 'New Chat',
  });

  if (!newChat.chat) {
    throw new ChatCreationError();
  }

  return { chatId: newChat.chat.id };
}
