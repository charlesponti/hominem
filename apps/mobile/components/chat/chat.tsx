import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import { FeatureErrorBoundary } from '~/components/error-boundary'
import queryClient from '~/utils/query-client'
import { useChatMessages, useEndChat, useSendMessage } from '~/utils/services/chat'
import { ChatInput } from './chat-input'
import ChatLoading from './chat-loading'
import { loadMarkdown, renderMessage, type MarkdownComponent } from './chat-message'
import { Text, theme } from '~/theme'

type ChatProps = {
  chatId: string
  onChatEnd: () => void
}
export const Chat = (props: ChatProps) => {
  const { chatId, onChatEnd } = props
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

  const renderItem = useCallback(
    ({ item }: { item: (typeof formattedMessages)[number] }) => renderMessage(item, Markdown),
    [Markdown]
  )

  return (
    <View style={styles.container}>
      {isMessagesLoading ? (
        <ChatLoading />
      ) : (
        <>
          <FlashList
            contentContainerStyle={styles.messagesContainer}
            data={formattedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={formattedMessages.length > 0}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d12',
    flexDirection: 'column',
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
