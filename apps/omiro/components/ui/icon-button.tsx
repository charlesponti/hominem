import type { SFSymbol } from 'expo-symbols';
import { Host, Button } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  disabled as disabledModifier,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';

import { componentSizes, useThemeColors } from '~/components/theme';

interface IconButtonProps {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon: SFSymbol;
  onPress?: () => void;
  pill?: boolean;
  testID?: string;
}

export function IconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  pill = false,
  testID,
}: IconButtonProps) {
  const themeColors = useThemeColors();
  const modifiers = [buttonStyle('borderless'), labelStyle('iconOnly')];
  if (disabled) modifiers.push(disabledModifier());

  return (
    <Host
      matchContents={!pill}
      style={
        pill
          ? {
              alignItems: 'center',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: themeColors['border-default'],
              height: componentSizes.lg,
              justifyContent: 'center',
              width: componentSizes.lg,
            }
          : undefined
      }
    >
      <Button
        label={accessibilityLabel}
        onPress={onPress}
        systemImage={icon}
        testID={testID}
        modifiers={modifiers}
      />
    </Host>
  );
}
