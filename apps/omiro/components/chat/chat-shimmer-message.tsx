import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, radii, spacing, transitionDurations } from '~/components/theme';

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
  const styles = useShimmerStyles();
  const animatedStyle = usePulse();

  if (variant === 'user') {
    return (
      <Animated.View style={[styles.row, styles.userRow, animatedStyle]}>
        <View style={[styles.line, styles.lineFull]} />
        <View style={[styles.line, styles.lineShort]} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.lines}>
        <Animated.View style={[styles.line, styles.lineFull, animatedStyle]} />
        <Animated.View style={[styles.line, styles.lineShort, animatedStyle]} />
      </View>
    </View>
  );
}

const useShimmerStyles = makeStyles((theme) => ({
  line: {
    backgroundColor: theme.colors['card'],
    borderRadius: radii.md,
    height: 16,
  },
  lineFull: {
    width: '100%',
  },
  lineShort: {
    width: '66%',
  },
  lines: {
    flex: 1,
    gap: spacing[2],
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    width: '100%',
  },
  userRow: {
    backgroundColor: theme.colors['popover'],
    borderCurve: 'continuous',
    borderRadius: radii.lg,
    gap: spacing[2],
  },
}));
