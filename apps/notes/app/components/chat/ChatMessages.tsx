import type { HonoClient } from '@hominem/hono-client';
import type {
  ChatsGetMessagesOutput,
  MessagesDeleteOutput,
  MessagesUpdateOutput,
} from '@hominem/hono-rpc/types';
import type React from 'react';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';
import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/components/ui/input';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useMatches } from 'react-router';

import type { ExtendedMessage } from '~/lib/types/chat-message';

import { useAutoScroll } from '~/lib/hooks/use-auto-scroll';
import { useMessageSearch } from '~/lib/hooks/use-message-search';
import { useScrollDetection } from '~/lib/hooks/use-scroll-detection';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import { findPreviousUserMessage } from '~/lib/utils/message';

import { ChatMessage } from './ChatMessage';
import { SkeletonMessage } from './SkeletonMessage';
import { ThinkingComponent } from './ThinkingComponent';

interface ChatMessagesProps {
  chatId: string;
  status?: string;
  error?: Error | null;
}

export const ChatMessages = forwardRef<{ showSearch: () => void }, ChatMessagesProps>(
  function ChatMessages({ chatId, status = 'idle', error }, ref) {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    const matches = useMatches();
    const rootData = matches.find((match) => match.id === 'root')?.data as
      | { supabaseId: string | null }
      | undefined;
    const userId = rootData?.supabaseId || undefined;

    const messagesQuery = useHonoQuery<ChatsGetMessagesOutput>(
      ['chats', 'getMessages', { chatId, limit: 50 }],
      async (client: HonoClient) => {
        const res = await client.api.chats[':id'].messages.$get({
          param: { id: chatId },
          query: { limit: '50' },
        });
        return res.json() as Promise<ChatsGetMessagesOutput>;
      },
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
      async (client: HonoClient, variables: { messageId: string }) => {
        const res = await client.api.messages[':messageId'].$delete({
          param: { messageId: variables.messageId },
        });
        return res.json() as Promise<MessagesDeleteOutput>;
      },
      {
        onSuccess: () => {
          // Invalidate messages list for this chat
          // Note: we need to match the query key structure
          utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
        },
      },
    );

    const sendMessage = useSendMessage({ chatId, userId });

    // Cast messages to extended type to handle optimistic updates
    // Note: our ChatMessage type vs ExtendedMessage type
    const extendedMessages = messages as unknown as ExtendedMessage[];
    const shouldUseVirtualScrolling = extendedMessages.length >= 50;

    // Virtual scrolling setup
    const virtualizer = useVirtualizer({
      count: extendedMessages.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 150, // Estimated height per message
      overscan: 5, // Render 5 extra items outside viewport
      enabled: shouldUseVirtualScrolling,
    });

    // Message search functionality
    const {
      searchQuery,
      setSearchQuery,
      filteredMessages,
      showSearch,
      setShowSearch,
      searchInputRef,
    } = useMessageSearch({ messages: extendedMessages });

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
      messageCount: extendedMessages.length,
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
    >(
      async (client: HonoClient, variables: { messageId: string; content: string }) => {
        const res = await client.api.messages[':messageId'].$patch({
          param: { messageId: variables.messageId },
          json: { content: variables.content },
        });
        return res.json() as Promise<MessagesUpdateOutput>;
      },
      {
        onSuccess: () => {
          utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
        },
      },
    );

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

    return (
      <div className="flex flex-col h-full">
        {/* Search Bar */}
        {showSearch && (
          <div className="border-b p-2 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                aria-label="Close search"
              >
                <X className="size-4" />
              </Button>
            </div>
            {searchQuery && (
              <div className="text-xs text-muted-foreground mt-1 px-1">
                {filteredMessages.length} {filteredMessages.length === 1 ? 'result' : 'results'}
              </div>
            )}
          </div>
        )}

        <div
          ref={shouldUseVirtualScrolling ? parentRef : messagesContainerRef}
          className="flex-1 overflow-y-auto p-4"
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="text-sm font-medium text-destructive mb-1">Chat Error</div>
              <div className="text-xs text-destructive/80">
                {displayError instanceof Error ? displayError.message : String(displayError)}
              </div>
            </div>
          )}

          {/* Loading state when fetching messages */}
          {isLoading && extendedMessages.length === 0 && (
            <div className="space-y-4">
              <SkeletonMessage />
              <SkeletonMessage />
              <SkeletonMessage />
            </div>
          )}

          {/* Messages */}
          {shouldUseVirtualScrolling ? (
            <div
              style={{
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
                    <div className="pb-4">
                      <ChatMessage
                        message={message}
                        isStreaming={
                          (status === 'streaming' &&
                            virtualItem.index === extendedMessages.length - 1 &&
                            message.role === 'assistant') ||
                          message.isStreaming
                        }
                        onRegenerate={
                          message.role === 'assistant'
                            ? () => handleRegenerate(message.id)
                            : undefined
                        }
                        onEdit={
                          message.role === 'user'
                            ? (messageId: string, newContent: string) =>
                                handleEditMessage(messageId, newContent)
                            : undefined
                        }
                        onDelete={() => handleDeleteMessage(message.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.length === 0 && searchQuery ? (
                <div className="text-center text-muted-foreground py-8">
                  <Search className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No messages found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={
                      (status === 'streaming' &&
                        index === filteredMessages.length - 1 &&
                        message.role === 'assistant') ||
                      message.isStreaming
                    }
                    onRegenerate={
                      message.role === 'assistant' ? () => handleRegenerate(message.id) : undefined
                    }
                    onEdit={
                      message.role === 'user'
                        ? (messageId: string, newContent: string) =>
                            handleEditMessage(messageId, newContent)
                        : undefined
                    }
                    onDelete={() => handleDeleteMessage(message.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Enhanced thinking component */}
        {showThinkingComponent && <ThinkingComponent />}
      </div>
    );
  },
);
