import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { memo, useCallback } from 'react';

import { ChatLinkedNoteContext } from '~/components/chat/chat-linked-note-context';
import { ChatMessage as ChatMessageView } from '~/components/chat/chat-message';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '~/components/chat/conversation';
import { Message, MessageContent } from '~/components/chat/message';
import { Shimmer } from '~/components/chat/shimmer';
import { Button } from '~/components/ui/button';
import type { useChatDisplayMessages } from '~/lib/hooks/use-chat-display-messages';
import type { useRegenerateMessage } from '~/lib/hooks/use-regenerate-message';
import type { useToolCallRespond } from '~/lib/hooks/use-tool-call-respond';
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
  toolCallRespond: ReturnType<typeof useToolCallRespond>;
  activeSpeechMessageId: string | null;
  autoSpeakMessageId: string | null;
  visibleMessages: ChatMessage[];
  onActivateSpeech: (messageId: string) => void;
  onDeactivateSpeech: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onUpdateMessage: (messageId: string, content: string) => Promise<void>;
  isDeleting: boolean;
  onRegenerate: (messageId: string) => void;
  onCancelRegenerate: () => void;
  onRetryRegenerate: () => void;
  loadState: 'loading' | 'error' | 'not-found' | 'ready';
  loadErrorMessage?: string;
  onRetryLoad: () => void;
  onStartNewChat: () => void;
}

function ChatConversationState({
  kind,
  message,
  onAction,
}: {
  kind: 'loading' | 'error' | 'not-found';
  message?: string;
  onAction: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.08 : 0.22;
  const isLoading = kind === 'loading';

  return (
    <m.div
      animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
      aria-label={isLoading ? 'Loading conversation' : undefined}
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-background/80 p-8 text-center"
      exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.995)' }}
      initial={{ opacity: 0, transform: 'translateY(8px) scale(0.985)' }}
      role={isLoading ? 'status' : 'alert'}
      transition={{ duration, ease: [0.23, 1, 0.32, 1] }}
    >
      {isLoading ? (
        <>
          <div
            aria-hidden="true"
            className="relative h-2 w-24 overflow-hidden rounded-full bg-muted"
          >
            <m.div
              animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
              className="absolute inset-y-0 w-1/2 rounded-full bg-primary/70"
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                ease: 'linear',
                repeat: reduceMotion ? 0 : Infinity,
              }}
            />
          </div>
          <span className="text-sm text-muted-foreground">Loading conversation</span>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {kind === 'not-found' ? 'Conversation unavailable' : 'Unable to load conversation'}
            </h2>
            <p className="max-w-[32ch] text-sm text-muted-foreground">
              {message ?? 'This conversation no longer exists or you do not have access to it.'}
            </p>
          </div>
          <Button
            onClick={onAction}
            title={kind === 'not-found' ? 'Start a new chat' : 'Retry loading'}
          >
            {kind === 'not-found' ? 'Start a new chat' : 'Retry loading'}
          </Button>
        </>
      )}
    </m.div>
  );
}

export const ChatConversation = memo(function ChatConversation({
  activeSpeechMessageId,
  autoSpeakMessageId,
  chatId,
  display,
  isDebugOpen,
  isSearchOpen,
  isDeleting,
  onActivateSpeech,
  onCancelRegenerate,
  onDeactivateSpeech,
  onDelete,
  onRegenerate,
  onRetryRegenerate,
  onUpdateMessage,
  loadErrorMessage,
  loadState,
  onRetryLoad,
  onStartNewChat,
  regeneration,
  search,
  seedNote,
  streamMessage,
  toolCallRespond,
  visibleMessages,
}: ChatConversationProps) {
  const approveTool = useCallback(
    ({ messageId, toolCallId }: { messageId: string; toolCallId: string }) =>
      void toolCallRespond.respond({ messageId, toolCallId, approved: true }),
    [toolCallRespond.respond],
  );
  const rejectTool = useCallback(
    ({ messageId, toolCallId }: { messageId: string; toolCallId: string }) =>
      void toolCallRespond.respond({ messageId, toolCallId, approved: false }),
    [toolCallRespond.respond],
  );

  return (
    <Conversation>
      <ConversationContent
        className="mx-auto min-h-full w-full max-w-5xl"
        scrollClassName="overflow-y-auto overscroll-contain"
      >
        <AnimatePresence initial mode="wait">
          {loadState === 'loading' ? (
            <ChatConversationState key="loading" kind="loading" onAction={onRetryLoad} />
          ) : loadState === 'error' ? (
            <ChatConversationState
              key="error"
              kind="error"
              message={loadErrorMessage}
              onAction={onRetryLoad}
            />
          ) : loadState === 'not-found' ? (
            <ChatConversationState key="not-found" kind="not-found" onAction={onStartNewChat} />
          ) : (
            <m.div
              animate={{ opacity: 1, transform: 'translateY(0)' }}
              className="flex min-h-full flex-1 flex-col gap-8"
              exit={{ opacity: 0, transform: 'translateY(-4px)' }}
              initial={{ opacity: 0, transform: 'translateY(8px)' }}
              key="messages"
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
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
                  isSpeechActive={activeSpeechMessageId === message.id}
                  shouldAutoSpeak={autoSpeakMessageId === message.id}
                  isGenerationActive={
                    streamMessage.isStreaming ||
                    streamMessage.status === 'awaiting_confirmation' ||
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
                  isToolResponding={toolCallRespond.isResponding}
                  message={message}
                  showDebug={isDebugOpen}
                  onActivateSpeech={onActivateSpeech}
                  onApproveTool={approveTool}
                  onDeactivateSpeech={onDeactivateSpeech}
                  onDelete={onDelete}
                  onRejectTool={rejectTool}
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
            </m.div>
          )}
        </AnimatePresence>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
});
