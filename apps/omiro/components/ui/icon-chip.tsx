import type { SFSymbol } from 'expo-symbols';
import React from 'react';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

import AppIcon from './icon';

interface IconChipProps {
  icon: SFSymbol;
  size?: number;
  radius?: number;
  iconSize?: number;
  tintColor?: ColorValue;
}

export function IconChip({ icon, size = 36, radius = 10, iconSize, tintColor }: IconChipProps) {
  const [cardColor] = useThemeColor(['--color-card']) as string[];

  return (
    <View
      style={[
        styles.s0,
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

const styles = makeStyles((theme) => ({
  s0: { alignItems: 'center', justifyContent: 'center' },
}));
