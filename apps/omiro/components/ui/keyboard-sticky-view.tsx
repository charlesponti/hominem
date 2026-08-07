import { forwardRef } from 'react';
import type { View } from 'react-native';
import {
  KeyboardStickyView as NativeKeyboardStickyView,
  type KeyboardStickyViewProps,
} from 'react-native-keyboard-controller';

export const KeyboardStickyView = forwardRef<View, KeyboardStickyViewProps>(
  ({ style, ...props }, ref) => {
    return <NativeKeyboardStickyView ref={ref} {...props} style={style} className="px-4" />;
  },
);

KeyboardStickyView.displayName = 'KeyboardStickyView';
