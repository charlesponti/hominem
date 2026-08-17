import type { ChatMessageItem } from '@hominem/chat';
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  type RefreshControlProps,
  Text,
  View,
} from 'react-native';

import { ChatMessage } from './chat-message';
import { ChatShimmerMessage } from './chat-shimmer-message';

const AUTO_SCROLL_TO_BOTTOM_THRESHOLD = 0.25;
const keyExtractor = (item: ChatMessageItem) => item.id;
type AccessibleChatMessage = ChatMessageItem & {
  errorMessage?: string | null;
  status?: string | null;
};

function announceMessage(message: AccessibleChatMessage, previous?: AccessibleChatMessage) {
  const failed = message.status === 'failed' || Boolean(message.errorMessage);
  const wasFailed = previous?.status === 'failed' || Boolean(previous?.errorMessage);

  if (failed && !wasFailed) {
    AccessibilityInfo.announceForAccessibility('Message failed to send. Tap retry.');
    return;
  }

  if (!previous) {
    if (message.role === 'user') {
      AccessibilityInfo.announceForAccessibility('Message sent.');
    } else if (message.isStreaming) {
      AccessibilityInfo.announceForAccessibility('Assistant is responding.');
    } else {
      AccessibilityInfo.announceForAccessibility('New assistant message.');
    }
    return;
  }

  if (previous.isStreaming && !message.isStreaming && !failed) {
    AccessibilityInfo.announceForAccessibility('Assistant reply complete.');
  }
}

interface ChatMessageListProps {
  isMessagesLoading: boolean;
  displayMessages: ChatMessageItem[];
  showSearch: boolean;
  searchQuery: string;
  showDebug: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  formatTimestamp: (value: string) => string;
  emptyState?: React.ReactElement | null;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /**
   * Extra bottom space to reserve so the newest messages don't render
   * underneath the floating, absolutely-positioned composer dock.
   */
  bottomInset?: number;
}

export function ChatMessageList({
  isMessagesLoading,
  displayMessages,
  showSearch,
  searchQuery,
  showDebug,
  onEdit,
  onRegenerate,
  onDelete,
  onRetry,
  formatTimestamp,
  emptyState,
  refreshControl,
  bottomInset = 0,
}: ChatMessageListProps) {
  const hasSearchQuery = showSearch && searchQuery.length > 0;
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const listRef = useRef<FlashListRef<ChatMessageItem> | null>(null);
  const prevCountRef = useRef(displayMessages.length);
  const prevLastMessageIdRef = useRef(displayMessages.at(-1)?.id ?? null);
  const announcedMessagesRef = useRef(new Map<string, AccessibleChatMessage>());
  const didInitializeAnnouncementsRef = useRef(false);
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    const previousMessages = announcedMessagesRef.current;
    if (
      !didInitializeAnnouncementsRef.current &&
      isMessagesLoading &&
      displayMessages.length === 0
    ) {
      return;
    }

    if (!didInitializeAnnouncementsRef.current) {
      for (const message of displayMessages) {
        previousMessages.set(message.id, message);
      }
      didInitializeAnnouncementsRef.current = true;
      return;
    }

    for (const message of displayMessages) {
      const previous = previousMessages.get(message.id);
      announceMessage(message, previous);
      previousMessages.set(message.id, message);
    }
  }, [displayMessages, isMessagesLoading]);

  // Force-scroll to the bottom when the user sends a new message, even if they'd
  // scrolled up. Auto-follow while already near the bottom (including while a
  // reply streams in) is handled natively by FlashList's maintainVisibleContentPosition
  // below, which avoids the flash-then-jump of an imperative scrollToEnd.
  useEffect(() => {
    const lastMessage = displayMessages.at(-1) ?? null;
    const countChanged = displayMessages.length !== prevCountRef.current;
    const lastMessageIdChanged = lastMessage?.id !== prevLastMessageIdRef.current;
    const shouldScrollForNewUserMessage =
      countChanged && lastMessageIdChanged && lastMessage?.role === 'user';

    prevCountRef.current = displayMessages.length;
    prevLastMessageIdRef.current = lastMessage?.id ?? null;

    if (showSearch || !shouldScrollForNewUserMessage) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [displayMessages, showSearch]);

  useEffect(() => {
    if (hasSearchQuery || didInitialScrollRef.current || displayMessages.length === 0) return;

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
      didInitialScrollRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [displayMessages.length, hasSearchQuery]);

  const renderItem = useCallback<ListRenderItem<ChatMessageItem>>(
    ({ item }) => (
      <ChatMessage
        formatTimestamp={formatTimestamp}
        message={item}
        {...{
          isActive: !item.isStreaming && activeActionMessageId === item.id,
          onActivate: item.isStreaming
            ? undefined
            : () =>
                setActiveActionMessageId((currentMessageId) =>
                  currentMessageId === item.id ? null : item.id,
                ),
          onEdit: item.isStreaming ? undefined : onEdit,
          onRegenerate: item.isStreaming ? undefined : onRegenerate,
          onDelete: item.isStreaming ? undefined : onDelete,
          onRetry,
          showDebug,
        }}
      />
    ),
    [activeActionMessageId, formatTimestamp, onDelete, onEdit, onRegenerate, onRetry, showDebug],
  );

  const emptySearch = useMemo(() => {
    if (!hasSearchQuery) return null;

    return (
      <View className="items-center pt-7">
        <Text className="font-mono text-sm text-tertiary">
          No messages matching &ldquo;{searchQuery}&rdquo;
        </Text>
      </View>
    );
  }, [hasSearchQuery, searchQuery]);

  const listEmptyComponent = hasSearchQuery ? emptySearch : (emptyState ?? null);
  if (isMessagesLoading && displayMessages.length === 0) {
    return (
      <View className="flex-1 pt-3">
        <ChatShimmerMessage />
        <ChatShimmerMessage variant="user" />
        <ChatShimmerMessage />
      </View>
    );
  }

  if (!hasSearchQuery && displayMessages.length === 0 && emptyState) {
    return (
      <View className="flex-1" style={{ paddingBottom: bottomInset }}>
        {emptyState}
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      className="flex-1"
      contentInsetAdjustmentBehavior="automatic"
      ListEmptyComponent={listEmptyComponent}
      ListFooterComponent={
        displayMessages.length > 0 ? (
          <Pressable
            accessibilityLabel="Chat message list bottom"
            onPress={() => setActiveActionMessageId(null)}
            className="grow min-h-8"
            testID="chat-message-list-bottom-sentinel"
          />
        ) : null
      }
      contentContainerStyle={[
        { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, rowGap: 20 },
        Platform.OS === 'android' ? { paddingBottom: bottomInset } : undefined,
      ]}
      // Content flows full-bleed behind the glass composer on iOS so it can
      // blur/refract it; contentInset just caps where scrolling rests, unlike
      // contentContainerStyle padding which would carve out dead space with
      // nothing behind the glass to blur (Android's composer is opaque, so it
      // uses real padding instead since there's no glass to see through).
      contentInset={Platform.OS === 'ios' ? { bottom: bottomInset } : undefined}
      scrollIndicatorInsets={Platform.OS === 'ios' ? { bottom: bottomInset } : undefined}
      data={displayMessages}
      keyExtractor={keyExtractor}
      maintainVisibleContentPosition={{
        startRenderingFromBottom: true,
        autoscrollToBottomThreshold: AUTO_SCROLL_TO_BOTTOM_THRESHOLD,
      }}
      onScrollBeginDrag={() => setActiveActionMessageId(null)}
      renderItem={renderItem}
      refreshControl={refreshControl}
      scrollEnabled={displayMessages.length > 0 || refreshControl !== undefined}
      testID="chat-message-list"
    />
  );
}
