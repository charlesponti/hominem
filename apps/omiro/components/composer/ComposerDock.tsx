import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingDockInset } from './composerDock.helpers';

export { getFloatingDockInset } from './composerDock.helpers';

interface ComposerDockProps {
  children: ReactNode;
  testID?: string;
  /**
   * Reports the extra space a scroll surface must reserve while the keyboard
   * is open, since this dock lifts above the keyboard by translating out of
   * its normal column position rather than resizing it.
   */
  onInsetChange?: (inset: number) => void;
}

export function ComposerDock({ children, testID, onInsetChange }: ComposerDockProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardState((state) => state.height);

  useEffect(() => {
    onInsetChange?.(getFloatingDockInset({ keyboardHeight, safeAreaBottom: insets.bottom }));
  }, [insets.bottom, keyboardHeight, onInsetChange]);

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      style={{ paddingBottom: insets.bottom }}
      testID={testID}
      className="px-4"
    >
      <View>{children}</View>
    </KeyboardStickyView>
  );
}
