import { useCallback } from 'react'
import { Pressable, View } from 'react-native'
import { Text, theme } from '~/theme'
import { useStartChat } from '~/utils/services/chat/use-chat-messages'
import { FeedbackBlock } from '../feedback-block'

type NoteFormMessageProps = {
  sherpaMessage: string
  userMessage: string
  onChatCreated: (chatId: string) => void
  onCloseClick: () => void
}
export const NoteFormMessage = ({
  sherpaMessage,
  userMessage,
  onChatCreated,
  onCloseClick,
}: NoteFormMessageProps) => {
  const { mutate: startChat, isPending } = useStartChat({
    userMessage,
    sherpaMessage,
    onSuccess: (data) => {
      onChatCreated(data.id)
    },
  })

  const onDiscussClick = useCallback(() => {
    startChat()
  }, [startChat])

  return (
    <FeedbackBlock style={{ paddingVertical: 12 }}>
      <Text variant="body" color="fg-primary">
        {sherpaMessage}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', columnGap: 12 }}>
        <Pressable
          disabled={isPending}
          onPress={onCloseClick}
          style={[
            {
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.quaternary,
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
            },
          ]}
        >
          <Text variant="body" color="gray">
            Close
          </Text>
        </Pressable>
        <Pressable
          disabled={isPending}
          onPress={onDiscussClick}
          style={[
            {
              flex: 1,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.quaternary,
              backgroundColor: isPending ? theme.colors.grayLight : theme.colors['fg-primary'],
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
            },
          ]}
        >
          <Text variant="body" color="white">
            Discuss
          </Text>
        </Pressable>
      </View>
    </FeedbackBlock>
  )
}
