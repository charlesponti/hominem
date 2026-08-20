import type { SFSymbol } from 'expo-symbols';
import { Pressable } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
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
        styles.s0,
        { backgroundColor: primary },
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <AppIcon name={icon} size={18} tintColor={primaryForeground} />
    </Pressable>
  );
}

const styles = makeStyles((theme) => ({
  s0: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
}));
