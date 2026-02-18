import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'

import queryClient from '~/utils/query-client'
import { useChatMessages, useEndChat } from '~/utils/services/chat/use-chat-messages'
import ChatLoading from './chat-loading'
import { loadMarkdown, renderMessage, type MarkdownComponent } from './chat-message'
import { Text, theme } from '~/theme'

export type ChatProps = {
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
  const [Markdown, setMarkdown] = useState<MarkdownComponent | null>(null)

  const formattedMessages = useMemo(() => (messages && messages.length > 0 ? messages : []), [messages])

  useEffect(() => {
    let isMounted = true
    loadMarkdown()
      .then((component) => {
        if (isMounted) setMarkdown(() => component)
      })
      .catch(() => {
        if (isMounted) setMarkdown(null)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const onEndChatPress = useCallback(() => {
    endChat()
  }, [endChat])
  const renderItem = useCallback(
    ({ item }: { item: (typeof formattedMessages)[number] }) => renderMessage(item, Markdown),
    [Markdown]
  )

  return (
    <View style={styles.container}>
      {isMessagesLoading ? (
        <ChatLoading />
      ) : (
        <FlashList
          contentContainerStyle={styles.messagesContainer}
          data={formattedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
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
  },
  messagesContainer: {
    flexGrow: 1,
    paddingBottom: 96,
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
