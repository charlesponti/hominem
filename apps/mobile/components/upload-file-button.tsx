import { MaterialIcons } from '@expo/vector-icons'
import type { PressableProps } from 'react-native'
import { Pressable, StyleSheet } from 'react-native'
import { theme } from '~/theme'

export const UploadFileButton = ({ style, ...props }: PressableProps) => {
  return (
    <Pressable style={[styles.button]} {...props}>
      <MaterialIcons name="add" size={24} color="black" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.grayLight,
    padding: 8,
    borderRadius: 50,
  },
})
