import type { SFSymbol } from 'expo-symbols';
import { Pressable } from 'react-native';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';

interface ComposerSendButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: SFSymbol;
  onPress: () => void;
  testID?: string;
}

// The always-visible filled circular action at the end of the composer row —
// distinct from the plain/bordered IconButton so it reads as the primary,
// terminal action (send) rather than one of several equal-weight controls.
export function ComposerSendButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  testID,
}: ComposerSendButtonProps) {
  const [primary, primaryForeground] = useCSSVariable([
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
      className="w-9 h-9 rounded-full items-center justify-center"
      style={({ pressed }) => [
        { backgroundColor: primary },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <AppIcon name={icon} size={18} tintColor={primaryForeground} />
    </Pressable>
  );
}
