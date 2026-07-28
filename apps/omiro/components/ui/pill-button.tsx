import type { SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { Pressable } from 'react-native';

import { componentSizes, makeStyles, useThemeColors } from '~/components/theme';
import AppIcon from '~/components/ui/icon';

interface PillButtonProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon: SFSymbol;
  onPress?: () => void;
  testID?: string;
  tintColor?: ColorValue;
}

export function PillButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  testID,
  tintColor,
}: PillButtonProps) {
  const themeColors = useThemeColors();
  const styles = useStyles();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: themeColors['border-default'] },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppIcon name={icon} size={componentSizes.icon} tintColor={tintColor} />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  pill: {
    width: componentSizes.lg,
    height: componentSizes.lg,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));
