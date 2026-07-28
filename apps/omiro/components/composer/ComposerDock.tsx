import { type ReactNode, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { componentSizes, lineHeights } from '~/components/theme';

export function getCollapsedComposerDockHeight(bottomInset: number) {
  return lineHeights.body + componentSizes.xl + bottomInset;
}

interface ComposerDockProps {
  children: ReactNode;
  onHeightChange?: (height: number) => void;
  testID?: string;
}

export function ComposerDock({ children, onHeightChange, testID }: ComposerDockProps) {
  const insets = useSafeAreaInsets();
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => onHeightChange?.(event.nativeEvent.layout.height + insets.bottom),
    [insets.bottom, onHeightChange],
  );

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      pointerEvents="box-none"
      style={[
        {
          paddingBottom: insets.bottom,
        },
      ]}
      testID={testID}
    >
      <View onLayout={onLayout}>{children}</View>
    </KeyboardStickyView>
  );
}
