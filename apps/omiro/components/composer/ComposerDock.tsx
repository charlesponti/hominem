import { useEffect, useState, type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingDockInset } from './composerDock.helpers';

export { getFloatingDockInset } from './composerDock.helpers';

interface ComposerDockProps {
  children: ReactNode;
  testID?: string;
  /**
   * Reports the space a scroll surface must reserve for this floating dock.
   * This includes its rendered height and, while the keyboard is open, the
   * portion of the screen the keyboard occupies above the safe area.
   */
  onInsetChange?: (inset: number) => void;
}

export function ComposerDock({ children, testID, onInsetChange }: ComposerDockProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => state.height);
  const [dockHeight, setDockHeight] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setDockHeight(event.nativeEvent.layout.height);
  };

  useEffect(() => {
    onInsetChange?.(
      getFloatingDockInset({
        dockHeight,
        keyboardHeight,
        safeAreaBottom: insets.bottom,
      }),
    );
  }, [dockHeight, insets.bottom, keyboardHeight, onInsetChange]);

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      onLayout={handleLayout}
      pointerEvents="box-none"
      style={{ bottom: 0, left: 0, paddingBottom: insets.bottom, position: 'absolute', right: 0 }}
      testID={testID}
      className="px-4"
    >
      <View>{children}</View>
    </KeyboardStickyView>
  );
}
