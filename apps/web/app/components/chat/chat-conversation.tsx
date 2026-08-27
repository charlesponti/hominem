import { memo } from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/ai-elements/conversation';
import { Message, MessageContent } from '~/components/ai-elements/message';
import { Shimmer } from '~/components/ai-elements/shimmer';
import { ChatLinkedNoteContext } from '~/components/chat/chat-linked-note-context';
import { ChatMessage as ChatMessageView } from '~/components/chat/chat-message';
import type { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import type { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import type { ChatMessageView as ChatMessage } from '~/lib/types/chat';

const getSpeechUrl = (chatId: string, messageId: string) =>
  `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/messages/${messageId}/speech`;

interface ChatConversationProps {
  chatId: string;
  display: ReturnType<typeof useChatDisplayMessages>;
  isDebugOpen: boolean;
  isSearchOpen: boolean;
  regeneration: ReturnType<typeof useRegenerateMessage>;
  search: { debouncedQuery: string; isSearching: boolean; results: ChatMessage[] };
  seedNote: { title?: string | null; excerpt?: string | null } | null;
  streamMessage: { isStreaming: boolean; status: string };
  visibleMessages: ChatMessage[];
  onDelete: (messageId: string) => Promise<void>;
  onUpdateMessage: (messageId: string, content: string) => Promise<void>;
  isDeleting: boolean;
  onRegenerate: (messageId: string) => void;
  onCancelRegenerate: () => void;
  onRetryRegenerate: () => void;
}

export const ChatConversation = memo(function ChatConversation({
  chatId,
  display,
  isDebugOpen,
  isSearchOpen,
  isDeleting,
  onCancelRegenerate,
  onDelete,
  onRegenerate,
  onRetryRegenerate,
  onUpdateMessage,
  regeneration,
  search,
  seedNote,
  streamMessage,
  visibleMessages,
}: ChatConversationProps) {
  return (
    <Conversation>
      <ConversationContent
        className="mx-auto w-full max-w-5xl"
        scrollClassName="overflow-y-auto overscroll-contain"
      >
        {seedNote ? (
          <ChatLinkedNoteContext
            excerpt={seedNote.excerpt}
            title={seedNote.title || 'Untitled note'}
          />
        ) : null}
        {isSearchOpen &&
        search.debouncedQuery &&
        !search.isSearching &&
        search.results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No messages found.</p>
        ) : null}
        {visibleMessages.map((message) => (
          <ChatMessageView
            key={message.id}
            isGenerationActive={
              streamMessage.isStreaming ||
              streamMessage.status === 'stopping' ||
              regeneration.isRegenerating
            }
            isRegenerating={regeneration.activeMessageId === message.id}
            regenerationStatus={
              regeneration.lastMessageId === message.id ? regeneration.status : 'idle'
            }
            regenerationError={
              regeneration.lastMessageId === message.id ? regeneration.error?.message : null
            }
            message={message}
            showDebug={isDebugOpen}
            onDelete={onDelete}
            onRegenerate={onRegenerate}
            onCancelRegenerate={onCancelRegenerate}
            onRetryRegenerate={onRetryRegenerate}
            onEdit={onUpdateMessage}
            isDeleting={isDeleting}
            speechSrc={getSpeechUrl(chatId, message.id)}
          />
        ))}
        {display.isThinking ? (
          <Message from="assistant">
            <MessageContent>
              <Shimmer>Thinking</Shimmer>
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
});
