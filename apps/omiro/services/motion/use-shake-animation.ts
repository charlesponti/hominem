import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// A short horizontal shake, used to draw attention to a validation error.
// Re-fires whenever `trigger` flips to true (e.g. an error becoming
// non-null) instead of continuously re-deriving from its value.
export function useShakeAnimation(trigger: boolean) {
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (!trigger) {
      return;
    }
    shakeX.value = withSequence(
      withTiming(10, { duration: 50, easing: Easing.linear }),
      withTiming(-10, { duration: 50, easing: Easing.linear }),
      withTiming(7, { duration: 50, easing: Easing.linear }),
      withTiming(-7, { duration: 50, easing: Easing.linear }),
      withTiming(0, { duration: 50, easing: Easing.linear }),
    );
  }, [trigger, shakeX]);

  return useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
}
