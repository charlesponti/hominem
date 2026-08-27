import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, transitionDurations, useThemeColor } from '~/components/theme';

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
          styles.userShimmer,
          [{ borderCurve: 'continuous', backgroundColor: popoverBg }, animatedStyle],
        ]}
      >
        <View style={[styles.userLine, { backgroundColor: cardBg }]} />
        <View style={[styles.userLineShort, { backgroundColor: cardBg }]} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.assistantShimmer}>
      <View style={styles.assistantContent}>
        <Animated.View
          style={[styles.assistantLine, [{ backgroundColor: cardBg }, animatedStyle]]}
        />
        <Animated.View
          style={[styles.assistantLineShort, [{ backgroundColor: cardBg }, animatedStyle]]}
        />
      </View>
    </View>
  );
}

const styles = makeStyles(() => ({
  userShimmer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    borderRadius: 8,
    gap: 8,
  },
  userLine: { borderRadius: 6, height: 16, width: '100%' },
  userLineShort: { borderRadius: 6, height: 16, width: 1 },
  assistantShimmer: { paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  assistantContent: { flex: 1, gap: 8 },
  assistantLine: { borderRadius: 6, height: 16, width: '100%' },
  assistantLineShort: { borderRadius: 6, height: 16, width: 1 },
}));
