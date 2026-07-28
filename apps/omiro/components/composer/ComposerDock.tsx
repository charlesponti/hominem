import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardStickyView } from '~/components/ui/keyboard-sticky-view';

interface ComposerDockProps {
  children: ReactNode;
  testID?: string;
}

export function ComposerDock({ children, testID }: ComposerDockProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardStickyView
      offset={{ closed: 0, opened: insets.bottom }}
      pointerEvents="box-none"
      style={{ paddingBottom: insets.bottom }}
      testID={testID}
    >
      <View>{children}</View>
    </KeyboardStickyView>
  );
}
