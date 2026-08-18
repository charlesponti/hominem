import type { View } from 'react-native';
import { measure, runOnJS, runOnUI, useAnimatedRef } from 'react-native-reanimated';
import type { AnimatedRef, MeasuredDimensions } from 'react-native-reanimated';

export type MeasuredRect = MeasuredDimensions;

/**
 * Composer/message measurement primitive for same-screen overlay handoffs
 * (toast, printer surface). Measures on the UI thread so the flight can start
 * from an accurate rect without waiting on a bridge round-trip; `onMeasured`
 * receives `null` if the node isn't mounted or measurement otherwise fails
 * (e.g. it was unmounted between the request and the UI-thread read).
 */
export function useMeasuredElement<TRef extends View = View>(): {
  ref: AnimatedRef<TRef>;
  measure: (onMeasured: (rect: MeasuredRect | null) => void) => void;
} {
  const ref = useAnimatedRef<TRef>();

  const measureElement = (onMeasured: (rect: MeasuredRect | null) => void) => {
    runOnUI(() => {
      'worklet';
      const measured = measure(ref);
      runOnJS(onMeasured)(measured);
    })();
  };

  return { ref, measure: measureElement };
}
