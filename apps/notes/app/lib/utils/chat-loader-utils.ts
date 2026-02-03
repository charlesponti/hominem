import type { HonoClientType } from '@hominem/hono-rpc/client';
import type { ChatsListOutput, ChatsCreateOutput } from '@hominem/hono-rpc/types';

import { ChatCreationError } from './errors';

/**
 * Gets the first existing chat or creates a new one
 * Returns the chat ID
 */
export async function getOrCreateChat(rpcClient: HonoClientType): Promise<{ chatId: string }> {
  const res = await rpcClient.api.chats.$get();
  const result = (await res.json()) as ChatsListOutput;

  if (Array.isArray(result) && result.length > 0) {
    const firstChat = result[0];
    if (firstChat) {
      return { chatId: firstChat.id };
    }
  }

  const createRes = await rpcClient.api.chats.$post({
    json: {
      title: 'New Chat',
    },
  });
  const createResult = (await createRes.json()) as ChatsCreateOutput;

  if (!createResult || !createResult.id) {
    throw new ChatCreationError();
  }

  return { chatId: createResult.id };
}
