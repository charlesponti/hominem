import { type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingDockInset } from './composerDock.helpers';

interface ComposerDockProps {
  children: ReactNode;
  safeAreaBottom: number;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function useComposerDockMetrics() {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => state.height);
  return {
    inset: getFloatingDockInset({ keyboardHeight, safeAreaBottom: insets.bottom }),
    safeAreaBottom: insets.bottom,
  };
}

export function ComposerDock({ children, safeAreaBottom, testID, onLayout }: ComposerDockProps) {
  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: safeAreaBottom }}
      style={{ paddingBottom: safeAreaBottom, paddingHorizontal: 8 }}
      testID={testID}
      onLayout={onLayout}
    >
      <View>{children}</View>
    </KeyboardStickyView>
  );
}
