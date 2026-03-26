import { useCallback, useMemo } from 'react';

import {
  findRegenerationSourceMessage,
  normalizeMessageContent,
  toSessionArtifactMessages,
} from './conversation';
import { useChatLifecycle, type UseChatLifecycleInput } from './use-chat-lifecycle';

export interface ChatControllerMessage {
  content: string;
  id: string;
  role: 'assistant' | 'system' | 'user';
}

export interface UseChatSessionControllerInput extends Pick<
  UseChatLifecycleInput,
  'onAcceptReview' | 'onError' | 'onRejectReview' | 'onTransform' | 'source'
> {
  messages: ChatControllerMessage[];
  onArchive?: () => Promise<void> | void;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onSendMessage?: (message: string) => Promise<unknown>;
  onUpdateMessage?: (messageId: string, content: string) => Promise<unknown>;
}

export function useChatSessionController({
  messages,
  onAcceptReview,
  onArchive,
  onDeleteMessage,
  onError,
  onRejectReview,
  onSendMessage,
  onTransform,
  onUpdateMessage,
  source,
}: UseChatSessionControllerInput) {
  const proposalMessages = useMemo(
    () => toSessionArtifactMessages(messages, (message) => message.content),
    [messages],
  );

  const lifecycle = useChatLifecycle({
    messages: proposalMessages,
    source,
    onTransform,
    onAcceptReview,
    onRejectReview,
    onError,
  });

  const handleArchive = useCallback(async () => {
    await onArchive?.();
  }, [onArchive]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      await onDeleteMessage?.(messageId);
    },
    [onDeleteMessage],
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      const normalizedContent = normalizeMessageContent(content);
      if (!normalizedContent) {
        return false;
      }

      await onUpdateMessage?.(messageId, normalizedContent);
      await onSendMessage?.(normalizedContent);
      return true;
    },
    [onSendMessage, onUpdateMessage],
  );

  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      const sourceMessage = findRegenerationSourceMessage(messages, messageId, (message) => {
        return message.content;
      });
      if (!sourceMessage) {
        return false;
      }

      await onDeleteMessage?.(messageId);
      await onSendMessage?.(sourceMessage);
      return true;
    },
    [messages, onDeleteMessage, onSendMessage],
  );

  return {
    ...lifecycle,
    handleArchive,
    handleDeleteMessage,
    handleEditMessage,
    handleRegenerateMessage,
    proposalMessages,
  };
}
