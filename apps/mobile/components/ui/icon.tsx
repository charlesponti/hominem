import type { TextStyle } from 'react-native'
import { Text } from 'react-native'
import Reanimated from 'react-native-reanimated'

import { theme } from '~/theme'
import unicodeMap from './fa-unicode-map.json'

export type MindsherpaIconName = keyof typeof unicodeMap

interface IconProps {
  color?: string
  name: MindsherpaIconName
  size: number
  style?: TextStyle | TextStyle[]
}

const MindsherpaIcon = ({ color = theme.colors.foreground, name, size, style }: IconProps) => {
  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : ''

  return <Text style={[{ fontFamily: 'fa-regular-400', color, fontSize: size }, style]}>{icon}</Text>
}

const AnimatedMindsherpaIcon = ({
  color = theme.colors.foreground,
  name,
  size,
  style,
}: IconProps & { style?: TextStyle | TextStyle[] }) => {
  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : ''

  return (
    <Reanimated.Text style={[{ fontFamily: 'fa-regular-400', color, fontSize: size }, style]}>
      {icon}
    </Reanimated.Text>
  )
}

export default MindsherpaIcon
