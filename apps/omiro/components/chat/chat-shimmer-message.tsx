import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, withAlpha } from '~/components/theme';
import { transitionDurations } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

const SHIMMER_DURATION = transitionDurations[150] * 5;

function usePulse() {
  const opacity = useDerivedValue(
    () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: SHIMMER_DURATION }),
          withTiming(0.4, { duration: SHIMMER_DURATION }),
        ),
        -1,
      ),
    [],
  );

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

interface ChatShimmerMessageProps {
  variant?: 'assistant' | 'user';
}

export function ChatShimmerMessage({ variant = 'assistant' }: ChatShimmerMessageProps) {
  const cardBg = useThemeColor('--color-card') as string;
  const popoverBg = useThemeColor('--color-popover') as string;
  const animatedStyle = usePulse();

  if (variant === 'user') {
    return (
      <Animated.View
        style={[
          styles.s0,
          [{ borderCurve: 'continuous', backgroundColor: popoverBg }, animatedStyle],
        ]}
      >
        <View style={[styles.s1, { backgroundColor: cardBg }]} />
        <View style={[styles.s2, { backgroundColor: cardBg }]} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.s3}>
      <View style={styles.s4}>
        <Animated.View style={[styles.s5, [{ backgroundColor: cardBg }, animatedStyle]]} />
        <Animated.View style={[styles.s6, [{ backgroundColor: cardBg }, animatedStyle]]} />
      </View>
    </View>
  );
}

const styles = makeStyles((theme) => ({
  s0: { paddingHorizontal: 16, paddingVertical: 12, width: '100%', borderRadius: 8, gap: 8 },
  s1: { borderRadius: 6, height: 16, width: '100%' },
  s2: { borderRadius: 6, height: 16, width: 1 },
  s3: { paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  s4: { flex: 1, gap: 8 },
  s5: { borderRadius: 6, height: 16, width: '100%' },
  s6: { borderRadius: 6, height: 16, width: 1 },
}));
