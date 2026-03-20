import { fontSizes } from '@hominem/ui/tokens';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, Text } from '~/theme';
import { VOID_EASING_STANDARD, VOID_MOTION_ENTER, VOID_MOTION_EXIT, VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';

// Stagger timing for thinking dots — 3-dot bounce cadence
const DOT_UP_DURATION = VOID_MOTION_ENTER;
const DOT_DOWN_DURATION = VOID_MOTION_EXIT;
const DOT_RETURN_DURATION = VOID_MOTION_DURATION_STANDARD;
const CYCLE_IDLE = VOID_MOTION_DURATION_STANDARD * 6; // idle period before repeating
const STAGGER_OFFSET = VOID_MOTION_ENTER; // ms between each dot

function useBounceDot(delayMs: number) {
  const translateY = useSharedValue(0);

  useAnimatedReaction(
    () => translateY.value,
    (_, prev) => {
      'worklet';
      if (prev === null) {
        translateY.value = withDelay(
          delayMs,
          withRepeat(
            withSequence(
              withTiming(-4, { duration: DOT_UP_DURATION, easing: VOID_EASING_STANDARD }),
              withTiming(2, { duration: DOT_DOWN_DURATION, easing: VOID_EASING_STANDARD }),
              withTiming(0, { duration: DOT_RETURN_DURATION, easing: VOID_EASING_STANDARD }),
              withTiming(0, { duration: CYCLE_IDLE }),
            ),
            -1,
          ),
        );
      }
    },
  );

  return useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
}

export function ChatThinkingIndicator() {
  const styles = useStyles();
  const dot1Style = useBounceDot(0);
  const dot2Style = useBounceDot(STAGGER_OFFSET);
  const dot3Style = useBounceDot(STAGGER_OFFSET * 2);

  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text variant="small" style={styles.label}>
          AI Assistant
        </Text>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
          <Text variant="small" style={styles.thinkingText}>
            Thinking...
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: {
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.sm_8,
    },
    content: {
      width: '100%',
      gap: t.spacing.sm_8,
    },
    label: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      fontWeight: '500',
      marginBottom: t.spacing.xs_4,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: t.borderRadii.md,
      backgroundColor: t.colors.foreground,
      opacity: 0.65,
    },
    thinkingText: {
      color: t.colors['text-tertiary'],
      fontSize: fontSizes.xs,
      marginLeft: t.spacing.xs_4,
    },
  }),
);
