import type { ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardStickyView } from '~/components/ui/keyboard-sticky-view';

interface ComposerDockProps {
  children: ReactNode;
  testID?: string;
  /**
   * Reports the dock's total rendered height (including the safe-area
   * bottom padding) so scrollable content can reserve enough space to
   * avoid rendering underneath this floating, absolutely-positioned dock.
   */
  onHeightChange?: (height: number) => void;
}

export function ComposerDock({ children, testID, onHeightChange }: ComposerDockProps) {
  const insets = useSafeAreaInsets();

  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      onLayout={handleLayout}
      pointerEvents="box-none"
      style={{ bottom: 0, left: 0, paddingBottom: insets.bottom, position: 'absolute', right: 0 }}
      testID={testID}
    >
      <View>{children}</View>
    </KeyboardStickyView>
  );
}
