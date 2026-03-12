import type { TextStyle } from 'react-native';
import { Text } from 'react-native';

import { theme } from '~/theme';

import unicodeMap from './fa-unicode-map.json';

export type AppIconName = keyof typeof unicodeMap;

interface IconProps {
  color?: string;
  name: AppIconName;
  size: number;
  style?: TextStyle | TextStyle[];
}

const AppIcon = ({ color = theme.colors.foreground, name, size, style }: IconProps) => {
  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : '';

  return (
    <Text style={[{ fontFamily: 'fa-regular-400', color, fontSize: size }, style]}>{icon}</Text>
  );
};

export default AppIcon;
