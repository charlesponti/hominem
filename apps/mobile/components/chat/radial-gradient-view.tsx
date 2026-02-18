import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { theme } from '~/theme'

export const RadialGradientView = ({
  children,
  style,
}: { children: ReactNode; style?: ViewStyle }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.gradientContainer}>
        <LinearGradient
          colors={['rgba(163, 171, 254, 0.5)', 'rgba(163, 171, 254, 0.05)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        <BlurView intensity={99} style={styles.gradient} />
      </View>
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
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
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
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 300,
    height: 700,
    borderRadius: 900,
    opacity: 0.5,
  },
})
