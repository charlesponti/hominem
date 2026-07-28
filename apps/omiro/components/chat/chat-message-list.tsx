import type { ChatMessageItem, ChatRenderIcon, MarkdownComponent } from '@hominem/chat';
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  Pressable,
  type RefreshControlProps,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Text, fontFamiliesNative, fontSizes, makeStyles, spacing } from '~/components/theme';

import { renderChatMessage } from './chat-message';
import { ChatShimmerMessage } from './chat-shimmer-message';

const CHAT_TURN_GAP = spacing[5];
const AUTO_SCROLL_END_THRESHOLD = spacing[8];
const keyExtractor = (item: ChatMessageItem) => item.id;

const useStyles = makeStyles(() => ({
  list: {
    flex: 1,
  },
  dismissArea: {
    flexGrow: 1,
    minHeight: spacing[8],
  },
  emptySearch: {
    alignItems: 'center',
    paddingTop: spacing[7],
  },
  emptySearchText: {
    fontFamily: fontFamiliesNative.mono,
    fontSize: fontSizes.sm,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    rowGap: CHAT_TURN_GAP,
  },
  shimmerContainer: {
    flex: 1,
    paddingTop: spacing[3],
  },
}));

interface ChatMessageListProps {
  isMessagesLoading: boolean;
  displayMessages: ChatMessageItem[];
  showSearch: boolean;
  searchQuery: string;
  markdown: MarkdownComponent | null;
  showDebug: boolean;
  onCopy: (message: ChatMessageItem) => void;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onShare: (message: ChatMessageItem) => void;
  renderIcon: ChatRenderIcon;
  formatTimestamp: (value: string) => string;
  emptyState?: React.ReactElement | null;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function ChatMessageList({
  isMessagesLoading,
  displayMessages,
  showSearch,
  searchQuery,
  markdown,
  showDebug,
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
  onShare,
  renderIcon,
  formatTimestamp,
  emptyState,
  refreshControl,
}: ChatMessageListProps) {
  const styles = useStyles();
  const hasSearchQuery = showSearch && searchQuery.length > 0;
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const listRef = useRef<FlashListRef<ChatMessageItem> | null>(null);
  const isNearEndRef = useRef(true);
  const prevCountRef = useRef(displayMessages.length);
  const prevLastMessageIdRef = useRef(displayMessages.at(-1)?.id ?? null);
  const isStreaming = displayMessages.at(-1)?.isStreaming ?? false;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromEnd = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    isNearEndRef.current = distanceFromEnd <= AUTO_SCROLL_END_THRESHOLD;
  }, []);

  // Scroll to end when new content arrives, but only if the user is already near the bottom.
  useEffect(() => {
    const lastMessage = displayMessages.at(-1) ?? null;
    const countChanged = displayMessages.length !== prevCountRef.current;
    const lastMessageIdChanged = lastMessage?.id !== prevLastMessageIdRef.current;
    const shouldScrollForNewUserMessage =
      countChanged && lastMessageIdChanged && lastMessage?.role === 'user';
    const shouldAutoScroll =
      !showSearch &&
      (shouldScrollForNewUserMessage || (isNearEndRef.current && (countChanged || isStreaming)));

    prevCountRef.current = displayMessages.length;
    prevLastMessageIdRef.current = lastMessage?.id ?? null;

    if (!shouldAutoScroll) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: countChanged });
    });
  }, [displayMessages, isStreaming, showSearch]);

  const renderItem = useCallback<ListRenderItem<ChatMessageItem>>(
    ({ item }) =>
      renderChatMessage(item, markdown, renderIcon, formatTimestamp, {
        isActive: !item.isStreaming && activeActionMessageId === item.id,
        onActivate: item.isStreaming
          ? undefined
          : () =>
              setActiveActionMessageId((currentMessageId) =>
                currentMessageId === item.id ? null : item.id,
              ),
        onCopy: item.isStreaming ? undefined : onCopy,
        onDelete: item.isStreaming ? undefined : onDelete,
        onEdit: item.isStreaming ? undefined : onEdit,
        onRegenerate: item.isStreaming ? undefined : onRegenerate,
        onShare: item.isStreaming ? undefined : onShare,
        showDebug,
      }),
    [
      activeActionMessageId,
      formatTimestamp,
      markdown,
      onCopy,
      onDelete,
      onEdit,
      onRegenerate,
      onShare,
      renderIcon,
      showDebug,
    ],
  );

  const emptySearch = useMemo(() => {
    if (!hasSearchQuery) return null;

    return (
      <View style={styles.emptySearch}>
        <Text color="tertiary" style={styles.emptySearchText}>
          No messages matching &ldquo;{searchQuery}&rdquo;
        </Text>
      </View>
    );
  }, [hasSearchQuery, searchQuery]);

  const listEmptyComponent = hasSearchQuery ? emptySearch : (emptyState ?? null);
  if (isMessagesLoading && displayMessages.length === 0) {
    return (
      <View style={styles.shimmerContainer}>
        <ChatShimmerMessage />
        <ChatShimmerMessage variant="user" />
        <ChatShimmerMessage />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      style={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      ListEmptyComponent={listEmptyComponent}
      ListFooterComponent={
        displayMessages.length > 0 ? (
          <Pressable onPress={() => setActiveActionMessageId(null)} style={styles.dismissArea} />
        ) : null
      }
      contentContainerStyle={styles.messagesContainer}
      data={displayMessages}
      keyExtractor={keyExtractor}
      onScroll={handleScroll}
      onScrollBeginDrag={() => setActiveActionMessageId(null)}
      renderItem={renderItem}
      refreshControl={refreshControl}
      scrollEnabled={displayMessages.length > 0 || refreshControl !== undefined}
      scrollEventThrottle={16}
    />
  );
}
