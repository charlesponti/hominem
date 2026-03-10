import FontAwesome from '@expo/vector-icons/FontAwesome'
import { forwardRef } from 'react'
import { Pressable, StyleSheet, type View } from 'react-native'

export const HeaderButton = forwardRef<View, { onPress?: () => void }>(
  ({ onPress }, ref) => {
    return (
      <Pressable ref={ref} onPress={onPress}>
        {({ pressed }) => (
          <FontAwesome
            name="info-circle"
            size={25}
            color="#FFFFFF"
            style={[
              styles.headerRight,
              {
                opacity: pressed ? 0.5 : 1,
              },
            ]}
          />
        )}
      </Pressable>
    )
  }
)

export const styles = StyleSheet.create({
  headerRight: {
    marginRight: 15,
  },
})
