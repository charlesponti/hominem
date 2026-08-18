import { useCallback, useEffect, useState } from 'react';
import { cancelAnimation, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from './native-motion';

export type MotionPhase = 'idle' | 'active' | 'done';

export interface InterruptibleMotion {
  /** JS-thread phase for conditional rendering; do not use it to drive style. */
  phase: MotionPhase;
  /** UI-thread progress (0 = start, 1 = resolved) for `useAnimatedStyle`. */
  progress: SharedValue<number>;
  /** Begin the motion from its start value toward resolved. */
  start: () => void;
  /**
   * Cancel-and-settle: stop whatever is running and resolve straight to the
   * end value, per the shared `cancel-and-settle` interruption policy (see
   * `nativeMotionContracts.interruption`). Call this when something else
   * demands the flight finish now — a second send arrives, the screen is
   * leaving — rather than letting it hang mid-motion or snap.
   */
  settle: (onDone?: () => void) => void;
  /**
   * Hard-stop with no resolving animation; the value freezes wherever it was
   * interrupted. Use only when the visual result no longer matters, e.g. the
   * flight's underlying message was discarded and the node is unmounting.
   */
  cancel: () => void;
}

/**
 * Generalizes the cancel-on-unmount + interruptible `withTiming` pattern
 * already used by `ChatThinkingIndicator`'s dot animation into a reusable
 * phase state machine, so composer/message flight primitives (toast handoff,
 * printer handoff) don't each reimplement shared-value lifecycle management.
 */
export function useInterruptibleMotion(): InterruptibleMotion {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [phase, setPhase] = useState<MotionPhase>('idle');

  const start = useCallback(() => {
    cancelAnimation(progress);
    setPhase('active');

    if (reducedMotion) {
      progress.value = 1;
      setPhase('done');
      return;
    }

    progress.value = withTiming(1, nativeMotionTiming.enter, (finished) => {
      if (finished) runOnJS(setPhase)('done');
    });
  }, [progress, reducedMotion]);

  const settle = useCallback(
    (onDone?: () => void) => {
      cancelAnimation(progress);
      setPhase('active');

      if (reducedMotion) {
        progress.value = 1;
        setPhase('done');
        onDone?.();
        return;
      }

      progress.value = withTiming(1, nativeMotionTiming.quick, (finished) => {
        if (finished) {
          runOnJS(setPhase)('done');
          if (onDone) runOnJS(onDone)();
        }
      });
    },
    [progress, reducedMotion],
  );

  const cancel = useCallback(() => {
    cancelAnimation(progress);
    setPhase('done');
  }, [progress]);

  useEffect(() => () => cancelAnimation(progress), [progress]);

  return { phase, progress, start, settle, cancel };
}
