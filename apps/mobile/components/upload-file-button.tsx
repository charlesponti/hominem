import { MaterialIcons } from '@expo/vector-icons'
import type { PressableProps } from 'react-native'
import { Pressable, StyleSheet } from 'react-native'
import { theme } from '~/theme'

export const UploadFileButton = ({ style, ...props }: PressableProps) => {
  return (
    <Pressable
      style={(state) => [
        styles.button,
        typeof style === 'function' ? style(state) : style,
        state.pressed ? styles.pressed : null,
      ]}
      {...props}
    >
      <MaterialIcons name="add" size={20} color={theme.colors.foreground} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.muted,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
})
