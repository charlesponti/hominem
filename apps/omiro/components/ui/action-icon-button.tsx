import type { SFSymbol } from 'expo-symbols';

import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';

export function ActionIconButton({
  disabled = false,
  icon,
  isDestructive: _isDestructive = false,
  onPress,
}: {
  disabled?: boolean;
  icon: SFSymbol;
  isDestructive?: boolean;
  onPress: () => void;
}) {
  return (
    <IconButton accessibilityLabel={icon} disabled={disabled} onPress={onPress}>
      <AppIcon name={icon} size={20} />
    </IconButton>
  );
}
