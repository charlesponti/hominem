import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionContracts, nativeMotionTiming } from '~/services/motion/native-motion';
import t from '~/translations';

const DOT_STAGGER_MS = nativeMotionContracts.duration.quick;
const DOT_TRAVEL = nativeMotionContracts.distance.rowEnter / 2;

function usePrinterDot(delayMs: number, reducedMotion: boolean) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(translateY);

    if (reducedMotion) {
      translateY.value = 0;
      return;
    }

    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-DOT_TRAVEL, nativeMotionTiming.enter),
          withTiming(DOT_TRAVEL, nativeMotionTiming.enter),
        ),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(translateY);
    };
  }, [delayMs, reducedMotion, translateY]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}

export function ChatThinkingIndicator({ compact = false }: { compact?: boolean }) {
  const textPrimary = useThemeColor('--color-foreground') as string;
  const reducedMotion = useReducedMotion();
  const dot1Style = usePrinterDot(0, reducedMotion);
  const dot2Style = usePrinterDot(DOT_STAGGER_MS, reducedMotion);
  const dot3Style = usePrinterDot(DOT_STAGGER_MS * 2, reducedMotion);

  return (
    <Animated.View
      style={[styles.container, compact ? styles.compact : styles.spacious]}
      exiting={
        reducedMotion
          ? FadeOut.duration(nativeMotionContracts.duration.quick)
          : FadeOutUp.duration(nativeMotionContracts.duration.quick)
      }
      testID="chat-assistant-activity"
    >
      <View style={styles.indicatorContent}>
        <View style={styles.indicatorRow}>
          <Animated.View style={[styles.dot, [{ backgroundColor: textPrimary }, dot1Style]]} />
          <Animated.View style={[styles.dot, [{ backgroundColor: textPrimary }, dot2Style]]} />
          <Animated.View style={[styles.dot, [{ backgroundColor: textPrimary }, dot3Style]]} />
          {!compact ? <Text style={styles.indicatorLabel}>{t.chat.thinkingIndicator}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = makeStyles((theme) => ({
  indicatorContent: { gap: 8, width: '100%' },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { borderRadius: 6, height: 8, width: 8 },
  indicatorLabel: { marginLeft: 4, color: theme.colors.tertiary },
  container: {},
  compact: { paddingTop: 4 },
  spacious: { paddingHorizontal: 16, paddingVertical: 8 },
}));
