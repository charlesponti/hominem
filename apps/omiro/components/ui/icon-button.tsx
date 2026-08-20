import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '~/components/theme';

interface IconButtonProps {
  accessibilityLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: 'bordered' | 'plain';
}

export function IconButton({
  accessibilityLabel,
  children,
  disabled = false,
  onPress,
  style,
  testID,
  variant = 'bordered',
}: IconButtonProps) {
  const styles = useStyles;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'plain' ? styles.plain : styles.bordered,
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((currentTheme) => ({
  button: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  bordered: { borderWidth: 1, borderColor: currentTheme.colors.border } satisfies ViewStyle,
  plain: { borderWidth: 0, borderColor: 'transparent' } satisfies ViewStyle,
  pressed: { opacity: 0.7 } satisfies ViewStyle,
  disabled: { opacity: 0.4 } satisfies ViewStyle,
}));
