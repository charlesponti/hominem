import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withClamp,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const FadeIn = ({ children }: { children: React.ReactNode }) => {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withClamp({ min: 0, max: 200 }, withSpring(opacity.value, { duration: 2000 })),
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
