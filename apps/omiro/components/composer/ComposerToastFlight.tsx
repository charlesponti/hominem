import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { nativeMotionContracts } from '~/services/motion/native-motion';
import { useInterruptibleMotion } from '~/services/motion/use-interruptible-motion';

import type { LocalRect } from '../chat/chat-motion-overlay';

const LIFT_DISTANCE = nativeMotionContracts.distance.sceneReveal;

/**
 * The kinetic-correspondence toast: a short-lived clone of the just-submitted
 * message that lifts from the composer and cross-fades into the real
 * transcript row landing underneath it. Purely visual -- `onSettled` is the
 * only thing that talks back to the overlay, so it can dismiss this node and
 * let the real row (hidden via `ChatMotionOverlayProvider.isInFlight` while
 * this is mounted) reveal in its place.
 */
export function ComposerToastFlight({
  text,
  rect,
  onSettled,
}: {
  text: string;
  rect: LocalRect;
  onSettled: () => void;
}) {
  const motion = useInterruptibleMotion();
  const textPrimary = useCSSVariable('--color-foreground') as string;

  useEffect(() => {
    motion.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (motion.phase === 'done') onSettled();
  }, [motion.phase, onSettled]);

  const style = useAnimatedStyle(() => {
    const progress = motion.progress.value;
    return {
      opacity: interpolate(progress, [0, 0.6, 1], [1, 1, 0]),
      transform: [
        { translateY: interpolate(progress, [0, 1], [0, -LIFT_DISTANCE]) },
        { scale: interpolate(progress, [0, 0.85, 1], [1, 1.02, 1]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ left: rect.left, position: 'absolute', top: rect.top, width: rect.width }, style]}
    >
      <View
        className="bg-popover rounded-lg px-2 py-2"
        style={{ borderCurve: 'continuous' }}
        testID="composer-toast-flight"
      >
        <Text style={{ color: textPrimary, fontSize: 16, lineHeight: 24 }}>{text}</Text>
      </View>
    </Animated.View>
  );
}
