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

export function ChatShimmerMessage() {
  const styles = useStyles();
  const animatedStyle = usePulse();
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.avatar, animatedStyle]} />
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
      flexDirection: 'row',
      gap: t.spacing.sm_12,
      padding: t.spacing.m_16,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.muted,
      flexShrink: 0,
    },
    lines: {
      flex: 1,
      gap: t.spacing.sm_8,
      paddingTop: t.spacing.xs_4,
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
