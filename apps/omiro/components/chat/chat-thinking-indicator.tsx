import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  Text,
  fontSizes,
  makeStyles,
  radii,
  spacing,
  transitionDurations,
} from '~/components/theme';
import t from '~/translations';

const DOT_UP_DURATION = transitionDurations[150];
const DOT_DOWN_DURATION = transitionDurations[100];
const DOT_RETURN_DURATION = transitionDurations[150];
const CYCLE_IDLE = transitionDurations[150] * 6;
const STAGGER_OFFSET = transitionDurations[150];

function useBounceDot(delayMs: number) {
  const translateY = useDerivedValue(
    () =>
      withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(-4, { duration: DOT_UP_DURATION }),
            withTiming(2, { duration: DOT_DOWN_DURATION }),
            withTiming(0, { duration: DOT_RETURN_DURATION }),
            withTiming(0, { duration: CYCLE_IDLE }),
          ),
          -1,
        ),
      ),
    [delayMs],
  );

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}

export function ChatThinkingIndicator() {
  const styles = useThinkingStyles();
  const dot1Style = useBounceDot(0);
  const dot2Style = useBounceDot(STAGGER_OFFSET);
  const dot3Style = useBounceDot(STAGGER_OFFSET * 2);

  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
          <Text color="tertiary" style={styles.thinkingText}>
            {t.chat.thinkingIndicator}
          </Text>
        </View>
      </View>
    </View>
  );
}

const useThinkingStyles = makeStyles((theme) => ({
  content: {
    gap: spacing[2],
    width: '100%',
  },
  dot: {
    backgroundColor: theme.colors['text-primary'],
    borderRadius: radii.md,
    height: 8,
    opacity: 0.65,
    width: 8,
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  row: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  thinkingText: {
    fontSize: fontSizes.xs,
    marginLeft: spacing[1],
  },
}));
