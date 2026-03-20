import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens'
import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'

import { Text, makeStyles } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat'

import { renderMessage, type MarkdownComponent } from './chat-message'
import { ChatShimmerMessage } from './chat-shimmer-message'
import { ChatThinkingIndicator } from './chat-thinking-indicator'

const keyExtractor = (item: MessageOutput) => item.id
const CHAT_COMPOSER_CLEARANCE = 220

interface ChatMessageListProps {
  isMessagesLoading: boolean
  displayMessages: MessageOutput[]
  showSearch: boolean
  searchQuery: string
  markdown: MarkdownComponent | null
  showDebug: boolean
  speakingId: string | null
  chatSendStatus: 'idle' | 'submitted' | 'streaming' | 'error'
  onCopy: (message: MessageOutput) => void
  onEdit: (messageId: string, content: string) => void
  onRegenerate: (messageId: string) => void
  onDelete: (messageId: string) => void
  onSpeak: (message: MessageOutput) => void
  onShare: (message: MessageOutput) => void
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
}: ChatMessageListProps) {
  const styles = useStyles()
  const hasSearchQuery = showSearch && searchQuery.length > 0
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null)

  const renderItem = useCallback(
    ({ item }: { item: MessageOutput }) =>
      renderMessage(item, markdown, {
        isActive: activeActionMessageId === item.id,
        showDebug,
        onCopy,
        onEdit,
        onRegenerate,
        onDelete,
        onSpeak,
        speakingId,
        onShare,
        onActivate: () =>
          setActiveActionMessageId((currentMessageId) =>
            currentMessageId === item.id ? null : item.id,
          ),
      }),
    [
      activeActionMessageId,
      markdown,
      onCopy,
      onDelete,
      onEdit,
      onRegenerate,
      onShare,
      onSpeak,
      showDebug,
      speakingId,
    ],
  )

  const emptySearch = useMemo(() => {
    if (!hasSearchQuery) {
      return null
    }

    return (
      <View style={styles.emptySearch}>
        <Text style={styles.emptySearchText}>No messages matching "{searchQuery}"</Text>
      </View>
    )
  }, [hasSearchQuery, searchQuery, styles.emptySearch, styles.emptySearchText])

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
        contentContainerStyle={styles.messagesContainer}
        data={displayMessages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={displayMessages.length > 0}
        ListEmptyComponent={emptySearch}
        ListFooterComponent={
          displayMessages.length > 0 ? (
            <Pressable onPress={() => setActiveActionMessageId(null)} style={styles.dismissArea} />
          ) : null
        }
        onScrollBeginDrag={() => setActiveActionMessageId(null)}
        removeClippedSubviews={false}
      />
      {chatSendStatus === 'submitted' && <ChatShimmerMessage />}
      {chatSendStatus === 'streaming' && <ChatThinkingIndicator />}
    </>
  )
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    messagesContainer: {
      flexGrow: 1,
      paddingTop: t.spacing.xs_4,
      paddingHorizontal: t.spacing.m_16,
      paddingBottom: CHAT_COMPOSER_CLEARANCE,
      rowGap: chatTokensNative.turnGap,
    },
    shimmerContainer: {
      flex: 1,
      paddingTop: t.spacing.sm_12,
    },
    emptySearch: {
      paddingTop: t.spacing.xl_48,
      alignItems: 'center',
    },
    dismissArea: {
      flexGrow: 1,
      minHeight: t.spacing.xl_64,
    },
    emptySearchText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.sm,
      fontFamily: fontFamiliesNative.mono,
    },
  }),
)
