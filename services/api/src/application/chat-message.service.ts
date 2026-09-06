import { ChatRepository } from '@hominem/db/chats';
import { runInTransaction } from '@hominem/db/transaction';
import { chatFileCleanupQueue } from '@hominem/queues';

export type DeleteChatMessageInput = {
  chatId: string;
  messageId: string;
  ownerUserId: string;
};

export class ChatMessageService {
  async deleteFollowing(
    input: DeleteChatMessageInput,
  ): Promise<Awaited<ReturnType<typeof ChatRepository.deleteUserMessageAndFollowing>>> {
    const result = await runInTransaction((trx) =>
      ChatRepository.deleteUserMessageAndFollowing(
        trx,
        input.chatId,
        input.messageId,
        input.ownerUserId,
      ),
    );

    if (result.cleanupFileIds.length > 0) {
      await chatFileCleanupQueue.add(
        'delete-chat-files',
        { userId: input.ownerUserId, fileIds: result.cleanupFileIds },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          jobId: `chat-file-cleanup:${input.chatId}:${input.messageId}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return result;
  }
}

export const chatMessageService = new ChatMessageService();
