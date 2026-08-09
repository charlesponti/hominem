import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import AppIcon from './icon';

interface IconChipProps {
  icon: SFSymbol;
  size?: number;
  radius?: number;
  iconSize?: number;
  tintColor?: ColorValue;
}

export function IconChip({ icon, size = 36, radius = 10, iconSize, tintColor }: IconChipProps) {
  const [cardColor] = useCSSVariable(['--color-card']) as string[];

  return (
    <View
      className="items-center justify-center"
      style={{
        backgroundColor: cardColor,
        borderRadius: radius,
        height: size,
        width: size,
      }}
    >
      <AppIcon name={icon} size={iconSize} tintColor={tintColor} />
    </View>
  );
}
