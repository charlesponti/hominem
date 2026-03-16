import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';

// 5x standard duration per direction (~600ms) for a slow, calm loading pulse
const SHIMMER_DURATION = VOID_MOTION_DURATION_STANDARD * 5;

function usePulse() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SHIMMER_DURATION }),
        withTiming(0.4, { duration: SHIMMER_DURATION }),
      ),
      -1,
    );
  }, [opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

interface ChatShimmerMessageProps {
  variant?: 'assistant' | 'user';
}

export function ChatShimmerMessage({ variant = 'assistant' }: ChatShimmerMessageProps) {
  const styles = useStyles();
  const animatedStyle = usePulse();

  if (variant === 'user') {
    return (
      <View style={[styles.row, styles.userRow]}>
        <Animated.View style={[styles.userBubble, animatedStyle]} />
      </View>
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

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      width: '100%',
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_12,
    },
    userRow: {
      alignItems: 'flex-end',
    },
    userBubble: {
      width: '78%',
      maxWidth: 420,
      height: 56,
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: t.colors['emphasis-minimal'],
    },
    lines: {
      flex: 1,
      gap: t.spacing.sm_8,
    },
    line: {
      height: 16,
      borderRadius: t.borderRadii.s_3,
      backgroundColor: t.colors.muted,
    },
    lineFull: {
      width: '100%',
    },
    lineShort: {
      width: '66%',
    },
  }),
);
