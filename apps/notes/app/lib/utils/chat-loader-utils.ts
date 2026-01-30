import type { HonoClientType } from '@hominem/hono-rpc/client';
import type { ChatsListOutput, ChatsCreateOutput } from '@hominem/hono-rpc/types';

import { ChatCreationError } from './errors';

/**
 * Gets the first existing chat or creates a new one
 * Returns the chat ID
 */
export async function getOrCreateChat(trpcClient: HonoClientType): Promise<{ chatId: string }> {
  const res = await trpcClient.api.chats.$get();
  const result = (await res.json()) as ChatsListOutput;

  if (Array.isArray(result) && result.length > 0) {
    return { chatId: result[0].id };
  }

  const createRes = await trpcClient.api.chats.$post({
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
