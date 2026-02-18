import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { AsciiTexture } from '~/components/ui/ascii-texture'
import { theme } from '~/theme'

const BlurredGradientBackground = ({ children }: { children: ReactNode }) => {
  return (
    <View style={styles.container}>
      <AsciiTexture />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
})

export default BlurredGradientBackground
