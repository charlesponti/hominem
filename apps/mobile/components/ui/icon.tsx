import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';
import { Text } from 'react-native';

import { theme } from '~/theme';

import unicodeMap from './fa-unicode-map.json';

export type AppIconName = keyof typeof unicodeMap;

// Maps FontAwesome icon names to SF Symbol names for key UI surfaces.
const SF_SYMBOL_MAP: Partial<Record<AppIconName, string>> = {
  inbox: 'tray',
  'pen-to-square': 'square.and.pencil',
  comment: 'bubble.left',
  'magnifying-glass': 'magnifyingglass',
  gear: 'gearshape',
  'arrow-left': 'arrow.left',
  plus: 'plus',
  x: 'xmark',
  camera: 'camera',
  microphone: 'mic',
  stop: 'stop.fill',
  share: 'square.and.arrow.up',
  'share-from-square': 'square.and.arrow.up',
  calendar: 'calendar',
  rotate: 'arrow.triangle.2.circlepath',
  'circle-plus': 'plus.circle',
  'arrow-up': 'arrow.up',
};

interface IconProps {
  color?: string;
  name: AppIconName;
  size: number;
  style?: TextStyle | TextStyle[];
  useSymbol?: boolean;
}

const AppIcon = ({ color = theme.colors.foreground, name, size, style, useSymbol }: IconProps) => {
  const sfSymbol = SF_SYMBOL_MAP[name];

  if (useSymbol && Platform.OS === 'ios' && sfSymbol) {
    return (
      <SymbolView
        name={sfSymbol as Parameters<typeof SymbolView>[0]['name']}
        size={size}
        tintColor={color}
        style={style as object}
      />
    );
  }

  const icon = unicodeMap[name]
    ? String.fromCharCode(Number.parseInt(unicodeMap[name].slice(2), 16))
    : '';

  return (
    <Text style={[{ fontFamily: 'fa-regular-400', color, fontSize: size }, style]}>{icon}</Text>
  );
};

export default AppIcon;
