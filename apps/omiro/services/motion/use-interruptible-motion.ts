import { useCallback, useEffect, useState } from 'react';
import { cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducedMotion } from '~/hooks/use-reduced-motion';

import { nativeMotionTiming } from './native-motion';

type MotionPhase = 'idle' | 'active' | 'done';

export interface InterruptibleMotion {
  // JS-thread phase for conditional rendering -- don't use it to drive style.
  phase: MotionPhase;
  // UI-thread progress (0 = start, 1 = resolved) for `useAnimatedStyle`.
  progress: SharedValue<number>;
  // Starts the motion from its start value toward resolved.
  start: () => void;
  // Cancel-and-settle: stop whatever's running and resolve straight to the
  // end value, per the shared `cancel-and-settle` interruption policy (see
  // `nativeMotionContracts.interruption`). Call this when something else
  // needs the flight to finish now -- a second send arrives, the screen's
  // leaving -- instead of letting it hang mid-motion or just snap.
  settle: (onDone?: () => void) => void;
  // Hard-stop, no resolving animation -- the value freezes wherever it got
  // interrupted. Only use this when the visual result doesn't matter
  // anymore, e.g. the flight's underlying message got discarded and the
  // node's unmounting.
  cancel: () => void;
}

// Generalizes the cancel-on-unmount + interruptible `withTiming` pattern
// already used by `ChatThinkingIndicator`'s dot animation into a reusable
// phase state machine, so composer/message flight primitives (toast handoff,
// printer handoff) don't each have to reimplement shared-value lifecycle
// management.
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
      if (finished) {
        scheduleOnRN(setPhase, 'done');
      }
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
          scheduleOnRN(setPhase, 'done');
          if (onDone) {
            scheduleOnRN(onDone);
          }
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
