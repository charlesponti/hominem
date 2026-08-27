import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '~/components/theme';

import AppIcon from './icon';

interface IconChipProps {
  icon: SFSymbol;
  size?: number;
  radius?: number;
  iconSize?: number;
  tintColor?: ColorValue;
}

export function IconChip({ icon, size = 36, radius = 10, iconSize, tintColor }: IconChipProps) {
  const { card: cardColor } = useAppTheme().colors;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardColor,
          borderRadius: radius,
          height: size,
          width: size,
        },
      ]}
    >
      <AppIcon name={icon} size={iconSize} tintColor={tintColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
