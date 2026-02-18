import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { theme } from '~/theme'

const { width, height } = Dimensions.get('window')

const BlurredGradientBackground = ({ children }: { children: ReactNode }) => {
  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <RadialGradient
              id="grad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="50%" stopColor="#E0E0FF" stopOpacity="1" />
              <Stop offset="100%" stopColor={theme.colors.grayMedium} stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#grad)" />

          {/* Add multiple blurred circles for the spread effect */}
          {/* <Circle cx={width * 0.3} cy={height * 0.2} r={100} fill="#E6E6FF" opacity={0.5} /> */}
          {/* <Circle cx={width * 0.7} cy={height * 0.4} r={150} fill="#F0F0FF" opacity={0.3} /> */}
          {/* <Circle cx={width * 0.5} cy={height * 0.6} r={200} fill="#F8F8FF" opacity={0.2} /> */}
        </Svg>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.grayMedium,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})

export default BlurredGradientBackground
