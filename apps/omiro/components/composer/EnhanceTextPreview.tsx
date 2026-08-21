import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from '~/services/motion/native-motion';

const PULSE_LOW_OPACITY = 0.35;

interface EnhanceTextPreviewProps {
  text: string;
  isLoading: boolean;
}

// The big centered draft/result text in the enhance sheet -- pulses while
// a request is in flight, then crossfades in once `text` swaps to the
// landed result (see enhance-sheet.tsx for the phase state machine driving
// isLoading/text).
export function EnhanceTextPreview({ text, isLoading }: EnhanceTextPreviewProps) {
  const textPrimary = useThemeColor('--color-foreground') as string;
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);

    if (reducedMotion) {
      opacity.value = 1;
      return;
    }

    if (isLoading) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(PULSE_LOW_OPACITY, nativeMotionTiming.enter),
          withTiming(1, nativeMotionTiming.enter),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = 0;
      opacity.value = withTiming(1, nativeMotionTiming.enter);
    }

    return () => cancelAnimation(opacity);
  }, [isLoading, reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text style={[styles.text, { color: textPrimary }, animatedStyle]}>
      {text}
    </Animated.Text>
  );
}

const styles = makeStyles((theme) => ({
  text: { ...theme.typography.title2, textAlign: 'center' },
}));
