import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { AsciiTexture } from '~/components/ui/ascii-texture'
import { theme } from '~/theme'

export const RadialGradientView = ({
  children,
  style,
}: { children: ReactNode; style?: ViewStyle }) => {
  return (
    <View style={[styles.container, style]}>
      <AsciiTexture />
      <View style={styles.textContainer}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    flex: 1,
  },
})
