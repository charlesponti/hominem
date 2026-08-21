import type { SFSymbol } from 'expo-symbols';
import { Pressable } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';
import AppIcon from '~/components/ui/icon';

interface ComposerSendButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: SFSymbol;
  onPress: () => void;
  testID?: string;
}

// A filled circular primary action -- distinct from the plain/bordered
// IconButton so it reads as the primary, terminal action (send, or the
// enhance sheet's accept checkmark) rather than one of several
// equal-weight controls. Generic over its icon, so it's reused wherever a
// screen needs exactly this shape.
export function ComposerSendButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  testID,
}: ComposerSendButtonProps) {
  const [primary, primaryForeground] = useThemeColor([
    '--color-primary',
    '--color-primary-foreground',
  ]) as string[];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.sendButton,
        { backgroundColor: primary },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <AppIcon name={icon} size={16} tintColor={primaryForeground} />
    </Pressable>
  );
}

const styles = makeStyles(() => ({
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
