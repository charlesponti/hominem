import type { ReactNode } from 'react';
import { Host } from '@expo/ui/swift-ui';
import { View } from 'react-native';

import { makeStyles } from '~/components/theme';

interface ComposerSurfaceProps {
  actions?: ReactNode;
  children?: ReactNode;
  destructive?: boolean;
  focused?: boolean;
  testID?: string;
}

export function ComposerSurface({
  actions,
  children,
  destructive = false,
  focused = false,
  testID,
}: ComposerSurfaceProps) {
  const styles = useStyles();

  const borderColor = destructive
    ? styles.destructive.borderColor
    : focused
      ? styles.focused.borderColor
      : undefined;

  return (
    <Host
      style={[
        styles.surface,
        borderColor ? { borderColor } : undefined,
        { borderColor: 'blue', borderWidth: 2 },
      ]}
      testID={testID}
    >
      <View style={[styles.inputRow, { borderColor: 'green', borderWidth: 2 }]}>{children}</View>
      {actions ? actions : null}
    </Host>
  );
}

const useStyles = makeStyles((theme) => ({
  destructive: { borderColor: theme.colors.destructive },
  focused: { borderColor: theme.colors.primary },
  inputRow: {
    borderBottomColor: theme.colors['border-default'],
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 1,
    width: '100%',
  },
  surface: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    flexDirection: 'column',
    gap: theme.spacing.md,
    width: '100%',
  },
}));
