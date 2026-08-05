import { forwardRef } from 'react';
import type { View } from 'react-native';
import {
  KeyboardStickyView as NativeKeyboardStickyView,
  type KeyboardStickyViewProps,
} from 'react-native-keyboard-controller';

import { makeStyles, SCREEN_MARGIN_HORIZONTAL } from '~/components/theme';

const useStyles = makeStyles((_theme) => ({
  container: {
    marginHorizontal: SCREEN_MARGIN_HORIZONTAL,
  },
}));

export const KeyboardStickyView = forwardRef<View, KeyboardStickyViewProps>(
  ({ style, ...props }, ref) => {
    const styles = useStyles();

    return <NativeKeyboardStickyView ref={ref} {...props} style={[styles.container, style]} />;
  },
);

KeyboardStickyView.displayName = 'KeyboardStickyView';
