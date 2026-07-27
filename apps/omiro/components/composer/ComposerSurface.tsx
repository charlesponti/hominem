import type { ReactNode } from 'react';
import { View } from 'react-native';

import { componentSizes, makeStyles, radii, spacing } from '~/components/theme';

import { COMPOSER_COLLAPSED_HEIGHT } from './ComposerDock';

interface ComposerSurfaceProps {
  children?: ReactNode;
  destructive?: boolean;
  focused?: boolean;
  leading?: ReactNode;
  secondaryActions?: ReactNode;
  testID?: string;
  trailing?: ReactNode;
}

export function ComposerSurface({
  children,
  destructive = false,
  focused = false,
  leading,
  secondaryActions,
  testID,
  trailing,
}: ComposerSurfaceProps) {
  const styles = useStyles();

  return (
    <View
      style={[styles.surface, focused && styles.focused, destructive && styles.destructive]}
      testID={testID}
    >
      <View style={styles.inputRow}>{children}</View>
      <View style={styles.toolbarRow}>
        {leading ? <View style={styles.action}>{leading}</View> : null}
        <View style={styles.toolbarSpacer} />
        {secondaryActions ? <View style={styles.secondaryActions}>{secondaryActions}</View> : null}
        {trailing ? <View style={styles.action}>{trailing}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  action: {
    alignItems: 'center',
    height: componentSizes.xl,
    justifyContent: 'center',
    width: componentSizes.xl,
  },
  destructive: { borderColor: theme.colors.destructive },
  focused: { borderColor: theme.colors.primary },
  inputRow: { width: '100%' },
  surface: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors['border-default'],
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'column',
    gap: spacing[2],
    minHeight: COMPOSER_COLLAPSED_HEIGHT,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    width: '100%',
  },
  toolbarRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  toolbarSpacer: {
    flex: 1,
  },
  secondaryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing[2],
  },
}));
