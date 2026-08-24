import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useMemo, useState } from 'react';

export function useChatDisplayMessages({ messages }: { messages: ChatMessageDto[] }) {
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<ChatMessageDto | null>(null);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<ChatMessageDto | null>(
    null,
  );

  const displayMessages = useMemo(() => {
    const list = [...messages];
    if (optimisticUserMessage && !list.some((message) => message.id === optimisticUserMessage.id)) {
      list.push(optimisticUserMessage);
    }
    if (
      pendingAssistantMessage &&
      !list.some((message) => message.id === pendingAssistantMessage.id)
    ) {
      list.push(pendingAssistantMessage);
    }
    return list;
  }, [messages, optimisticUserMessage, pendingAssistantMessage]);

  return {
    displayMessages,
    isThinking: optimisticUserMessage !== null && pendingAssistantMessage === null,
    optimisticUserMessage,
    pendingAssistantMessage,
    setOptimisticUserMessage,
    setPendingAssistantMessage,
  };
}
