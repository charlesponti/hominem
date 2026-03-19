import React from 'react';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  VOID_EASING_ENTER,
  VOID_EASING_EXIT,
  VOID_ENTER_TRANSLATE_Y,
  VOID_EXIT_TRANSLATE_Y,
  VOID_MOTION_ENTER,
  VOID_MOTION_EXIT,
} from '~/theme/motion';

/**
 * FadeIn — wraps children in the canonical enter animation.
 * opacity 0→1, translateY 6→0, 150ms decelerate.
 */
export const FadeIn = ({ children }: { children: React.ReactNode }) => {
  const opacity = useSharedValue<number>(0);
  const translateY = useSharedValue<number>(VOID_ENTER_TRANSLATE_Y);

  useAnimatedReaction(
    () => opacity.value,
    (_, prev) => {
      'worklet';
      if (prev === null) {
        opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
        translateY.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

/**
 * useVoidEnter — shared value pair for component enter.
 * Call triggerEnter() to start the animation.
 */
export const useVoidEnter = () => {
  const opacity = useSharedValue<number>(0);
  const translateY = useSharedValue<number>(VOID_ENTER_TRANSLATE_Y);

  const triggerEnter = React.useCallback(() => {
    opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
    translateY.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { triggerEnter, animatedStyle };
};

/**
 * useVoidExit — shared value pair for component exit.
 * Call triggerExit(onComplete) to start the animation.
 */
export const useVoidExit = () => {
  const opacity = useSharedValue<number>(1);
  const translateY = useSharedValue<number>(0);

  const triggerExit = React.useCallback(
    (onComplete?: () => void) => {
      opacity.value = withTiming(
        0,
        { duration: VOID_MOTION_EXIT, easing: VOID_EASING_EXIT },
        (finished) => {
          if (finished && onComplete) onComplete();
        },
      );
      translateY.value = withTiming(VOID_EXIT_TRANSLATE_Y, {
        duration: VOID_MOTION_EXIT,
        easing: VOID_EASING_EXIT,
      });
    },
    [opacity, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { triggerExit, animatedStyle };
};
