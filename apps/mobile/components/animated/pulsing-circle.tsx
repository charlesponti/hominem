import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { theme } from '~/theme';

export const PulsingCircle = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 3, duration: 1500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [scaleAnim]);

  return <Animated.View style={[styles.circle, { transform: [{ scale: scaleAnim }] }]} />;
};

const styles = StyleSheet.create({
  circle: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: theme.colors.blueDark,
  },
});
