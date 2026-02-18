import { Pressable, View } from 'react-native'
import { Text, theme } from '~/theme'
import type { MessageOutput } from '~/utils/services/chat/use-chat-messages'
import MindsherpaIcon from '../ui/icon'

export const ChatMessageActions = ({ message }: { message: MessageOutput }) => {
  const onAddToFocusPress = () => {
    console.log('add to focus')
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        columnGap: 12,
      }}
    >
      <Pressable
        onPress={onAddToFocusPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderColor: theme.colors.grayDark,
          borderWidth: 1,
          borderRadius: 12,
        }}
      >
        <Text variant="body" color="fg-primary">
          Add to focus
        </Text>
        <MindsherpaIcon name="wand-magic-sparkles" size={20} color={theme.colors.grayDark} />
      </Pressable>
    </View>
  )
}
