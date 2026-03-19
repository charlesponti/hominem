import { chatTokensNative, fontFamiliesNative, fontSizes } from '@hominem/ui/tokens'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'

import { Text, makeStyles } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat'

import { renderMessage, type MarkdownComponent } from './chat-message'
import { ChatShimmerMessage } from './chat-shimmer-message'
import { ChatThinkingIndicator } from './chat-thinking-indicator'

const keyExtractor = (item: MessageOutput) => item.id

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

  const renderItem = useCallback<ListRenderItem<MessageOutput>>(
    ({ item }) =>
      renderMessage(item, markdown, {
        showDebug,
        onCopy,
        onEdit,
        onRegenerate,
        onDelete,
        onSpeak,
        speakingId,
        onShare,
      }),
    [markdown, onCopy, onDelete, onEdit, onRegenerate, onShare, onSpeak, showDebug, speakingId],
  )

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
      <FlashList
        contentContainerStyle={styles.messagesContainer}
        data={displayMessages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={displayMessages.length > 0}
        ListEmptyComponent={
          showSearch && searchQuery.length > 0 ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No messages matching "{searchQuery}"</Text>
            </View>
          ) : null
        }
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
      paddingTop: t.spacing.m_16,
      paddingHorizontal: t.spacing.m_16,
      paddingBottom: t.spacing.sm_12,
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
    emptySearchText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.sm,
      fontFamily: fontFamiliesNative.mono,
    },
  }),
)
