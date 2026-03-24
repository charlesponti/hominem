import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { chatTokensNative, fontFamiliesNative, fontSizes, spacing } from '../../tokens'
import { Text } from '../typography/text.native'
import { ChatShimmerMessage } from './chat-shimmer-message.mobile'
import { ChatThinkingIndicator } from './chat-thinking-indicator.mobile'
import { renderChatMessage } from './chat-message.mobile'
import type { ChatMessageItem, ChatRenderIcon, MarkdownComponent } from './chat.types'

const CHAT_COMPOSER_CLEARANCE = 220
const keyExtractor = (item: ChatMessageItem) => item.id

interface ChatMessageListProps {
  isMessagesLoading: boolean
  displayMessages: ChatMessageItem[]
  showSearch: boolean
  searchQuery: string
  markdown: MarkdownComponent | null
  showDebug: boolean
  speakingId: string | null
  chatSendStatus: 'idle' | 'submitted' | 'streaming' | 'error'
  onCopy: (message: ChatMessageItem) => void
  onEdit: (messageId: string, content: string) => void
  onRegenerate: (messageId: string) => void
  onDelete: (messageId: string) => void
  onSpeak: (message: ChatMessageItem) => void
  onShare: (message: ChatMessageItem) => void
  renderIcon: ChatRenderIcon
  formatTimestamp: (value: string) => string
}

export function ChatMessageList({
  isMessagesLoading,
  displayMessages,
  showSearch,
  searchQuery,
  markdown,
  showDebug,
  speakingId,
  chatSendStatus,
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
  onSpeak,
  onShare,
  renderIcon,
  formatTimestamp,
}: ChatMessageListProps) {
  const hasSearchQuery = showSearch && searchQuery.length > 0
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null)

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageItem }) =>
      renderChatMessage(item, markdown, renderIcon, formatTimestamp, {
        isActive: activeActionMessageId === item.id,
        onActivate: () =>
          setActiveActionMessageId((currentMessageId) =>
            currentMessageId === item.id ? null : item.id,
          ),
        onCopy,
        onDelete,
        onEdit,
        onRegenerate,
        onShare,
        onSpeak,
        showDebug,
        speakingId,
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
      onSpeak,
      renderIcon,
      showDebug,
      speakingId,
    ],
  )

  const emptySearch = useMemo(() => {
    if (!hasSearchQuery) return null

    return (
      <View style={styles.emptySearch}>
        <Text color="text-tertiary" style={styles.emptySearchText}>
          No messages matching "{searchQuery}"
        </Text>
      </View>
    )
  }, [hasSearchQuery, searchQuery])

  if (isMessagesLoading) {
    return (
      <View style={styles.shimmerContainer}>
        <ChatShimmerMessage />
        <ChatShimmerMessage variant="user" />
        <ChatShimmerMessage />
      </View>
    )
  }

  return (
    <>
      <FlatList
        ListEmptyComponent={emptySearch}
        ListFooterComponent={
          displayMessages.length > 0 ? (
            <Pressable onPress={() => setActiveActionMessageId(null)} style={styles.dismissArea} />
          ) : null
        }
        contentContainerStyle={styles.messagesContainer}
        data={displayMessages}
        keyExtractor={keyExtractor}
        onScrollBeginDrag={() => setActiveActionMessageId(null)}
        removeClippedSubviews={false}
        renderItem={renderItem}
        scrollEnabled={displayMessages.length > 0}
      />
      {chatSendStatus === 'submitted' ? <ChatShimmerMessage /> : null}
      {chatSendStatus === 'streaming' ? <ChatThinkingIndicator /> : null}
    </>
  )
}

const styles = StyleSheet.create({
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
    paddingBottom: CHAT_COMPOSER_CLEARANCE,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    rowGap: chatTokensNative.turnGap,
  },
  shimmerContainer: {
    flex: 1,
    paddingTop: spacing[3],
  },
})
