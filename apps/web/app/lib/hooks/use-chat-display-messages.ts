import { useMemo, useState } from 'react';

import type { ChatMessageView } from '~/lib/types/chat';

export function useChatDisplayMessages({ messages }: { messages: ChatMessageView[] }) {
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<ChatMessageView | null>(null);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<ChatMessageView | null>(
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
