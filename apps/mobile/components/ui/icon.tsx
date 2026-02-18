import type { ViewStyle } from 'react-native'
import { Text } from 'react-native'
import Reanimated, { type StyleProps } from 'react-native-reanimated'

import { theme } from '~/theme'
import unicodeMap from './fa-unicode-map.json'

export type MindsherpaIconName = keyof typeof unicodeMap

interface IconProps {
  color?: string
  name: MindsherpaIconName
  size: number
  style?: ViewStyle | ViewStyle[]
}

export const MindsherpaIcon = ({ color = theme.colors.black, name, size, style }: IconProps) => {
  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : ''

  return (
    <Text style={[{ fontFamily: 'Font Awesome Regular', color, fontSize: size }, style]}>
      {icon}
    </Text>
  )
}

export const AnimatedMindsherpaIcon = ({
  color = theme.colors.black,
  name,
  size,
  style,
}: IconProps & { style: StyleProps }) => {
  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : ''

  return (
    <Reanimated.Text
      style={[
        { fontFamily: 'Font Awesome Regular', color, fontSize: size },
        ...(Array.isArray(style) ? style : [style]),
      ]}
    >
      {icon}
    </Reanimated.Text>
  )
}

export default MindsherpaIcon
