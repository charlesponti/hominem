import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'

import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services/types'
import { FeatureErrorBoundary } from '~/components/error-boundary'
import queryClient from '~/utils/query-client'
import { useChatMessages, useEndChat, useSendMessage } from '~/utils/services/chat'
import type { MessageOutput } from '~/utils/services/chat'
import { ChatInput } from './chat-input'
import ChatLoading from './chat-loading'
import { loadMarkdown, renderMessage, type MarkdownComponent } from './chat-message'
import { ArtifactActions } from './artifact-actions'
import { ClassificationReview } from './classification-review'
import { ContextAnchor, type SessionSource } from './context-anchor'
import { Text, theme } from '~/theme'

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
  const { isPending: isMessagesLoading, data: messages } = useChatMessages({ chatId })
  const { mutate: endChat, isPending: isEnding } = useEndChat({
    chatId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', chatId] })
      onChatEnd()
    },
  })
  const { sendChatMessage, isChatSending } = useSendMessage({ chatId })
  const [message, setMessage] = useState('')
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [lifecycleState, setLifecycleState] = useState<ThoughtLifecycleState>('idle')
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)

  const formattedMessages = useMemo(() => (messages && messages.length > 0 ? messages : []), [messages])

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
    void sendChatMessage()
    setMessage('')
  }, [sendChatMessage])

  const renderItem = useCallback<ListRenderItem<MessageOutput>>(
    ({ item }) => renderMessage(item, Markdown),
    [Markdown]
  )

  // Phase 7: classification API not yet implemented.
  // Passes through 'classifying' so ArtifactActions dim state renders before the review sheet.
  const handleTransform = useCallback((_type: ArtifactType) => {
    setLifecycleState('classifying')
    queueMicrotask(() => {
      setLifecycleState('reviewing_changes')
      setPendingReview({
        proposedType: 'note',
        proposedTitle: 'Untitled note',
        proposedChanges: ['Classification API not yet implemented'],
        previewContent: '',
      })
    })
  }, [])

  const handleAcceptReview = useCallback(() => {
    setLifecycleState('idle')
    setPendingReview(null)
  }, [])

  const handleRejectReview = useCallback(() => {
    setLifecycleState('idle')
    setPendingReview(null)
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ContextAnchor source={source} />
      </View>
      {isMessagesLoading ? (
        <ChatLoading />
      ) : (
        <>
          <FlashList
            contentContainerStyle={styles.messagesContainer}
            data={formattedMessages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            scrollEnabled={formattedMessages.length > 0}
          />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    rowGap: 12,
  },
  endButton: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors['fg-primary'],
    marginBottom: 24,
  },
})

// Wrapped export with error boundary
export const ChatWithErrorBoundary = (props: ChatProps) => (
  <FeatureErrorBoundary featureName="Chat">
    <Chat {...props} />
  </FeatureErrorBoundary>
)
