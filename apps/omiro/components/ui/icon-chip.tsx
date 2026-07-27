import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';

import { useThemeColors } from '~/components/theme';

import AppIcon from './icon';

interface IconChipProps {
  icon: SFSymbol;
  size?: number;
  radius?: number;
  iconSize?: number;
  tintColor?: ColorValue;
}

export function IconChip({ icon, size = 36, radius = 10, iconSize, tintColor }: IconChipProps) {
  const themeColors = useThemeColors();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: themeColors['card'],
        borderRadius: radius,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <AppIcon name={icon} size={iconSize} tintColor={tintColor} />
    </View>
  );
}
