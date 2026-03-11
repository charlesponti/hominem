import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Alert, Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native'
import { useApiClient } from '@hominem/hono-client/react'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useMutation } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'

import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services/types'
import { buildNoteProposal, deriveSessionSource } from '@hominem/chat-services/ui'
import { FeatureErrorBoundary } from '~/components/error-boundary'
import queryClient from '~/utils/query-client'
import { useChatMessages, useEndChat, useSendMessage } from '~/utils/services/chat'
import type { MessageOutput } from '~/utils/services/chat'
import { ChatInput } from './chat-input'
import { ChatShimmerMessage } from './chat-shimmer-message'
import { ChatThinkingIndicator } from './chat-thinking-indicator'
import { loadMarkdown, renderMessage, type MarkdownComponent } from './chat-message'
import { ArtifactActions } from './artifact-actions'
import { ClassificationReview } from './classification-review'
import { ContextAnchor, type SessionSource } from './context-anchor'
import { Text, theme } from '~/theme'
import MindsherpaIcon from '../ui/icon'

const keyExtractor = (item: MessageOutput) => item.id

interface PendingReview {
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
}

type ChatProps = {
  chatId: string
  onChatEnd: () => void
  source: SessionSource
}
export const Chat = (props: ChatProps) => {
  const { chatId, onChatEnd, source } = props
  const client = useApiClient()
  const { isPending: isMessagesLoading, data: messages } = useChatMessages({ chatId })
  const { mutate: endChat, isPending: isEnding } = useEndChat({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] })
      onChatEnd()
    },
  })
  const { sendChatMessage, isChatSending, chatSendStatus } = useSendMessage({ chatId })
  const [message, setMessage] = useState('')
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle')
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)
  const [persistedSource, setPersistedSource] = useState<SessionSource | null>(null)

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<TextInput>(null)

  const formattedMessages = useMemo(() => (messages && messages.length > 0 ? messages : []), [messages])

  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return formattedMessages
    const lower = searchQuery.toLowerCase()
    return formattedMessages.filter((m) => m.message?.toLowerCase().includes(lower))
  }, [formattedMessages, searchQuery])

  const proposalMessages = useMemo(
    () => formattedMessages.map((message) => ({ role: message.role, content: message.message })),
    [formattedMessages],
  )
  const resolvedSource = useMemo(
    () =>
      persistedSource ?? (
        source.kind === 'artifact'
          ? source
          : deriveSessionSource({ messages: proposalMessages })
      ),
    [persistedSource, proposalMessages, source],
  )
  const createNote = useMutation({
    mutationKey: ['chat-note', chatId],
    mutationFn: async (review: PendingReview) => {
      return client.notes.create({
        content: review.previewContent,
        excerpt: review.previewContent.slice(0, 160),
        title: review.proposedTitle,
        type: 'note',
      })
    },
  })

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    loadMarkdown()
      .then((component) => {
        if (!signal.aborted) setMarkdown(() => component)
      })
      .catch(() => {
        if (!signal.aborted) setMarkdown(null)
      })

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const onEndChatPress = useCallback(() => {
    endChat()
  }, [endChat])

  const handleSendMessage = useCallback((messageText: string) => {
    if (!messageText.trim()) return
    void sendChatMessage(messageText)
    setMessage('')
  }, [sendChatMessage])

  const handleCopyMessage = useCallback((copiedMessage: MessageOutput) => {
    const text = copiedMessage.message
    if (!text) return

    if (Platform.OS !== 'web') {
      void Clipboard.setStringAsync(text).catch(() => {
        void Share.share({
          message: text,
          title: 'Copy message',
        })
      })
      return
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .catch(() => {
          void Share.share({
            message: text,
            title: 'Copy message',
          })
        })
      return
    }

    void Share.share({
      message: text,
      title: 'Copy message',
    })
  }, [])

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      const messageIndex = formattedMessages.findIndex((message) => message.id === messageId)
      if (messageIndex === -1) return

      const previousUserMessage = [...formattedMessages]
        .slice(0, messageIndex)
        .reverse()
        .find((message) => message.role === 'user' && message.message.trim().length > 0)

      if (!previousUserMessage) return

      try {
        await client.messages.delete({ messageId })
      } catch {
        // Intentionally fall through to keep parity with existing UX while avoiding hard failure
      }

      await sendChatMessage(previousUserMessage.message)
    },
    [client.messages, formattedMessages, sendChatMessage],
  )

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      const trimmedContent = content.trim()
      if (!trimmedContent) return

      try {
        await client.messages.update({
          messageId,
          content: trimmedContent,
        })
      } catch {
        return
      }

      await sendChatMessage(trimmedContent)
    },
    [client.messages, sendChatMessage],
  )

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      void client.messages.delete({ messageId }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] })
      })
    },
    [chatId, client.messages],
  )

  const renderItem = useCallback<ListRenderItem<MessageOutput>>(
    ({ item }) =>
      renderMessage(item, Markdown, {
        onCopy: handleCopyMessage,
        onEdit: handleEditMessage,
        onRegenerate: handleRegenerate,
        onDelete: handleDeleteMessage,
      }),
    [Markdown, handleCopyMessage, handleEditMessage, handleRegenerate, handleDeleteMessage],
  )

  // Phase 7: classification API not yet implemented.
  // Passes through 'classifying' so ArtifactActions dim state renders before the review sheet.
  const handleTransform = useCallback((_type: ArtifactType) => {
    setLifecycleState('classifying')
    const proposal = buildNoteProposal(proposalMessages)
    queueMicrotask(() => {
      setLifecycleState('reviewing_changes')
      setPendingReview(proposal)
    })
  }, [proposalMessages])

  const handleAcceptReview = useCallback(async () => {
    if (!pendingReview) return

    setLifecycleState('persisting')

    try {
      const note = await createNote.mutateAsync(pendingReview)
      setPersistedSource({
        kind: 'artifact',
        id: note.id,
        type: 'note',
        title: note.title || pendingReview.proposedTitle,
      })
      setLifecycleState('idle')
      setPendingReview(null)
    } catch {
      setLifecycleState('reviewing_changes')
      Alert.alert('Could not save note', 'Please try again.')
    }
  }, [createNote, pendingReview])

  const handleRejectReview = useCallback(() => {
    setLifecycleState('idle')
    setPendingReview(null)
  }, [])

  const handleToggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchQuery('')
      } else {
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      return !prev
    })
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ContextAnchor source={resolvedSource} />
        <Pressable
          onPress={handleToggleSearch}
          style={styles.searchToggle}
          accessibilityLabel={showSearch ? 'Close search' : 'Search messages'}
          testID="chat-search-toggle"
        >
          <MindsherpaIcon
            name={showSearch ? 'x' : 'magnifying-glass'}
            size={18}
            color={showSearch ? theme.colors.foreground : theme.colors['text-tertiary']}
          />
        </Pressable>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search messages…"
            placeholderTextColor={theme.colors['text-tertiary']}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            testID="chat-search-input"
          />
          {searchQuery.length > 0 && (
            <Text style={styles.searchResultCount}>
              {displayMessages.length} result{displayMessages.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      {isMessagesLoading ? (
        <View style={styles.shimmerContainer}>
          <ChatShimmerMessage />
          <ChatShimmerMessage />
          <ChatShimmerMessage />
        </View>
      ) : (
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
                  <Text style={styles.emptySearchText}>
                    No messages matching "{searchQuery}"
                  </Text>
                </View>
              ) : null
            }
          />
          {chatSendStatus === 'submitted' && <ChatShimmerMessage />}
          {chatSendStatus === 'streaming' && <ChatThinkingIndicator />}
          <ArtifactActions
            state={lifecycleState}
            messageCount={formattedMessages.length}
            onTransform={handleTransform}
          />
          <ChatInput
            message={message}
            onMessageChange={setMessage}
            onSendMessage={handleSendMessage}
            isPending={isChatSending}
          />
        </>
      )}

      <Pressable style={styles.endButton} onPress={onEndChatPress} disabled={isEnding}>
        <Text variant="label" color="white">
          {isEnding ? 'Ending…' : 'End Chat'}
        </Text>
      </Pressable>

      {lifecycleState === 'reviewing_changes' && pendingReview && (
        <ClassificationReview
          proposedType={pendingReview.proposedType}
          proposedTitle={pendingReview.proposedTitle}
          proposedChanges={pendingReview.proposedChanges}
          previewContent={pendingReview.previewContent}
          onAccept={handleAcceptReview}
          onReject={handleRejectReview}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['border-default'],
  },
  searchToggle: {
    marginLeft: 'auto',
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['border-default'],
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 14,
    fontFamily: 'Geist Mono',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: 8,
  },
  searchResultCount: {
    color: theme.colors['text-tertiary'],
    fontSize: 12,
    fontFamily: 'Geist Mono',
  },
  messagesContainer: {
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    rowGap: 12,
  },
  shimmerContainer: {
    flex: 1,
    paddingTop: 8,
  },
  emptySearch: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    color: theme.colors['text-tertiary'],
    fontSize: 14,
    fontFamily: 'Geist Mono',
  },
  endButton: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors['text-primary'],
    marginBottom: 24,
  },
})

// Wrapped export with error boundary
export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
)
