import { type ReactNode, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { componentSizes, makeStyles, spacing } from '~/components/theme';

export const COMPOSER_COLLAPSED_HEIGHT = componentSizes.xl * 2 + spacing[2] * 3;

export function getCollapsedComposerDockHeight(bottomInset: number) {
  return getComposerDockHeight(COMPOSER_COLLAPSED_HEIGHT, bottomInset);
}

export function getComposerDockHeight(contentHeight: number, bottomInset: number) {
  return contentHeight + bottomInset + spacing[2];
}

interface ComposerDockProps {
  children: ReactNode;
  onHeightChange?: (height: number) => void;
  testID?: string;
}

export function ComposerDock({ children, onHeightChange, testID }: ComposerDockProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const onLayout = useCallback(
    (event: LayoutChangeEvent) =>
      onHeightChange?.(getComposerDockHeight(event.nativeEvent.layout.height, insets.bottom)),
    [insets.bottom, onHeightChange],
  );

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      pointerEvents="box-none"
      style={[
        styles.dock,
        {
          paddingBottom: insets.bottom + spacing[2],
          paddingHorizontal: spacing[4],
        },
      ]}
      testID={testID}
    >
      <View onLayout={onLayout} style={styles.content}>
        {children}
      </View>
    </KeyboardStickyView>
  );
}

const useStyles = makeStyles(() => ({
  content: { gap: spacing[2] },
  dock: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
}));
