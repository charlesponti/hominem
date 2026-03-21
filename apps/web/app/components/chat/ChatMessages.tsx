import { useAuthContext } from '@hominem/auth';
import type { ThoughtLifecycleState } from '@hominem/chat-services/types';
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/rpc/react';
import type {
  ChatsGetMessagesOutput,
  MessagesDeleteOutput,
  MessagesUpdateOutput,
} from '@hominem/rpc/types/chat.types';
import { Inline } from '@hominem/ui';
import { ShimmerMessage, ThinkingIndicator } from '@hominem/ui/ai-elements';
import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/components/ui/input';
import { chatTokens } from '@hominem/ui/tokens';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import type React from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { useAutoScroll } from '~/lib/hooks/use-auto-scroll';
import { useMessageSearch } from '~/lib/hooks/use-message-search';
import { useScrollDetection } from '~/lib/hooks/use-scroll-detection';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import type { ExtendedMessage } from '~/lib/types/chat-message';
import { findPreviousUserMessage } from '~/lib/utils/message';

import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
  chatId: string;
  status?: string;
  error?: Error | null;
  showDebug?: boolean;
  lifecycleState?: ThoughtLifecycleState;
}

export const ChatMessages = forwardRef<{ showSearch: () => void }, ChatMessagesProps>(
  function ChatMessages(
    { chatId, status = 'idle', error, showDebug = false, lifecycleState: _lifecycleState = 'idle' },
    ref,
  ) {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    const { userId } = useAuthContext();

    const messagesQuery = useHonoQuery<ChatsGetMessagesOutput>(
      ['chats', 'getMessages', { chatId, limit: 50 }],
      ({ chats }) => chats.getMessages({ chatId, limit: 50 }),
      {
        enabled: !!chatId,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    );

    const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
    const isLoading = messagesQuery.isLoading;
    const messagesError = messagesQuery.error;

    const utils = useHonoUtils();

    const deleteMessageMutation = useHonoMutation<MessagesDeleteOutput, { messageId: string }>(
      ({ messages }, variables) => messages.delete(variables),
      {
        onSuccess: () => {
          // Invalidate messages list for this chat
          // Note: we need to match the query key structure
          utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
        },
      },
    );

    const sendMessage = useSendMessage({ chatId, ...(userId && { userId }) });

    const extendedMessages: ExtendedMessage[] = messages;
    const shouldUseVirtualScrolling = extendedMessages.length >= 50;

    // Message search functionality
    const {
      searchQuery,
      setSearchQuery,
      filteredMessages,
      showSearch,
      setShowSearch,
      searchInputRef,
    } = useMessageSearch({ messages: extendedMessages });
    const displayMessages = filteredMessages;

    // Virtual scrolling setup
    const virtualizer = useVirtualizer({
      count: displayMessages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 150, // Estimated height per message
      overscan: 5, // Render 5 extra items outside viewport
      enabled: shouldUseVirtualScrolling,
    });

    // Expose showSearch method via ref
    useImperativeHandle(ref, () => ({
      showSearch: () => {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      },
    }));

    // Scroll detection
    const { isNearBottom, checkIfNearBottom } = useScrollDetection({
      containerRef: messagesContainerRef as React.RefObject<HTMLDivElement | null>,
      parentRef: parentRef as React.RefObject<HTMLDivElement | null>,
      threshold: 100,
      shouldUseVirtualScrolling,
    });

    // Auto-scroll functionality
    useAutoScroll({
      containerRef: messagesContainerRef as React.RefObject<HTMLDivElement | null>,
      parentRef: parentRef as React.RefObject<HTMLDivElement | null>,
      virtualizer,
      messageCount: displayMessages.length,
      status,
      isNearBottom,
      shouldUseVirtualScrolling,
      checkIfNearBottom,
    });

    // Check if there's a streaming message (last message is assistant and streaming)
    const lastMessage =
      extendedMessages.length > 0 ? extendedMessages[extendedMessages.length - 1] : undefined;
    const hasStreamingMessage =
      extendedMessages.length > 0 &&
      lastMessage !== undefined &&
      lastMessage.role === 'assistant' &&
      (status === 'streaming' || lastMessage.isStreaming);

    // Show thinking component only when submitted but no streaming message yet
    const showThinkingComponent =
      status === 'submitted' || (status === 'streaming' && !hasStreamingMessage);

    // Use the error from the hook if available, otherwise use the prop
    const displayError = messagesError || error;

    const handleDeleteMessage = useCallback(
      async (messageId: string) => {
        try {
          await deleteMessageMutation.mutateAsync({ messageId });
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      },
      [deleteMessageMutation],
    );

    const updateMessageMutation = useHonoMutation<
      MessagesUpdateOutput,
      { messageId: string; content: string }
    >(({ messages }, variables) => messages.update(variables), {
      onSuccess: () => {
        utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
      },
    });

    const handleRegenerate = useCallback(
      async (messageId: string) => {
        const messageIndex = extendedMessages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) return;

        const userMessage = findPreviousUserMessage(extendedMessages, messageIndex);
        if (userMessage) {
          // Delete the assistant message and regenerate
          await handleDeleteMessage(messageId);
          // Send the user message again to regenerate
          await sendMessage.mutateAsync({
            message: userMessage.content || '',
            chatId,
          });
        }
      },
      [extendedMessages, handleDeleteMessage, sendMessage, chatId],
    );

    const handleEditMessage = useCallback(
      async (messageId: string, newContent: string) => {
        try {
          // Update message (backend handles deleting subsequent messages)
          await updateMessageMutation.mutateAsync({
            messageId,
            content: newContent,
          });
          // Regenerate AI response by sending the edited message
          await sendMessage.mutateAsync({
            message: newContent,
            chatId,
          });
        } catch (error) {
          console.error('Failed to update message:', error);
        }
      },
      [updateMessageMutation, sendMessage, chatId],
    );

    // Virtual scrolling render
    const virtualItems = useMemo(() => {
      if (!shouldUseVirtualScrolling) return null;
      return virtualizer.getVirtualItems();
    }, [shouldUseVirtualScrolling, virtualizer]);

    useEffect(() => {
      if (shouldUseVirtualScrolling) {
        virtualizer.measure();
      }
    }, [showDebug, shouldUseVirtualScrolling, virtualizer]);

    return (
      <div className="relative flex h-full min-h-0 flex-col">
        {showSearch && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 px-4 sm:px-6">
            <div
              className="pointer-events-auto mx-auto w-full rounded-md border border-border-subtle bg-background/95 p-4 shadow-md shadow-black/5 backdrop-blur supports-backdrop-filter:bg-background/90"
              style={{ maxWidth: chatTokens.searchMaxWidth }}
              role="dialog"
              aria-modal="true"
              aria-label="Search messages"
            >
              <div className="mb-3 text-xs font-medium tracking-[0.05em] text-text-tertiary">
                Search messages
              </div>
              <Inline gap="sm">
                <Search className="size-4 text-text-tertiary" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm placeholder:text-text-tertiary border-0 focus:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSearch(false);
                      setSearchQuery('');
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  aria-label="Close search"
                  className="text-text-tertiary hover:text-foreground hover:bg-transparent"
                >
                  <X className="size-4" />
                </Button>
              </Inline>
              {searchQuery && (
                <div className="mt-2 px-1 text-xs text-text-tertiary">
                  {filteredMessages.length} {filteredMessages.length === 1 ? 'match' : 'matches'}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={shouldUseVirtualScrolling ? parentRef : messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-8 pt-6 sm:px-6"
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          aria-atomic="false"
          style={
            shouldUseVirtualScrolling
              ? {
                  height: '100%',
                  width: '100%',
                  overflow: 'auto',
                }
              : {}
          }
        >
          {/* Error Display */}
          {displayError && (
            <div
              className="mx-auto mb-6 w-full"
              style={{
                maxWidth: chatTokens.transcriptMaxWidth,
                borderRadius: chatTokens.radii.bubble,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'var(--color-destructive-muted)',
                backgroundColor: 'rgba(255, 59, 48, 0.05)',
                padding: 'var(--spacing-4)',
                boxShadow: 'var(--shadow-low)',
              }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--color-destructive)', marginBottom: 'var(--spacing-1)' }}>
                Something went wrong
              </div>
              <div className="text-xs" style={{ color: 'var(--color-destructive-muted)' }}>
                {displayError instanceof Error ? displayError.message : String(displayError)}
              </div>
            </div>
          )}

          {/* Loading state when fetching messages */}
          {isLoading && extendedMessages.length === 0 && (
            <div
              className="mx-auto w-full space-y-5"
              style={{ maxWidth: chatTokens.transcriptMaxWidth }}
            >
              <ShimmerMessage />
              <ShimmerMessage />
              <ShimmerMessage />
            </div>
          )}

          {/* Messages */}
          {shouldUseVirtualScrolling ? (
            <div
              className="mx-auto w-full"
              style={{
                maxWidth: chatTokens.transcriptMaxWidth,
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems?.map((virtualItem) => {
                const message = filteredMessages[virtualItem.index];
                if (!message) {
                  return null;
                }
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div style={{ paddingTop: 'var(--spacing-2)', paddingBottom: 'var(--spacing-2)' }}>
                      <ChatMessage
                        message={message}
                        showDebug={showDebug}
                        isStreaming={
                          (status === 'streaming' &&
                            virtualItem.index === displayMessages.length - 1 &&
                            message.role === 'assistant') ||
                          (message.isStreaming ?? false)
                        }
                        {...(message.role === 'assistant' && {
                          onRegenerate: () => handleRegenerate(message.id),
                        })}
                        {...(message.role === 'user' && {
                          onEdit: (messageId: string, newContent: string) =>
                            handleEditMessage(messageId, newContent),
                        })}
                        onDelete={() => handleDeleteMessage(message.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="mx-auto w-full"
              style={{ maxWidth: chatTokens.transcriptMaxWidth }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: chatTokens.turnGap }}>
                {displayMessages.length === 0 && searchQuery ? (
                  <div className="text-center text-text-secondary py-8">
                    <Search className="size-8 mx-auto mb-2" />
                    <p>No messages found matching &quot;{searchQuery}&quot;</p>
                  </div>
                ) : (
                  displayMessages.map((message, index) => (
                    <div key={message.id} style={{ paddingTop: 'var(--spacing-2)', paddingBottom: 'var(--spacing-2)' }}>
                      <ChatMessage
                        message={message}
                        showDebug={showDebug}
                        isStreaming={
                          (status === 'streaming' &&
                            index === displayMessages.length - 1 &&
                            message.role === 'assistant') ||
                          (message.isStreaming ?? false)
                        }
                        {...(message.role === 'assistant' && {
                          onRegenerate: () => handleRegenerate(message.id),
                        })}
                        {...(message.role === 'user' && {
                          onEdit: (messageId: string, newContent: string) =>
                            handleEditMessage(messageId, newContent),
                        })}
                        onDelete={() => handleDeleteMessage(message.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thinking indicator */}
        {showThinkingComponent && <ThinkingIndicator />}
      </div>
    );
  },
);
