import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
