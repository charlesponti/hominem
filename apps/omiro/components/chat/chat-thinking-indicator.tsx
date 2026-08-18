import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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
  const textPrimary = useCSSVariable('--color-foreground') as string;
  const reducedMotion = useReducedMotion();
  const dot1Style = usePrinterDot(0, reducedMotion);
  const dot2Style = usePrinterDot(DOT_STAGGER_MS, reducedMotion);
  const dot3Style = usePrinterDot(DOT_STAGGER_MS * 2, reducedMotion);

  return (
    <View className={compact ? 'pt-1' : 'px-4 py-2'} testID="chat-assistant-activity">
      <View className="gap-2 w-full">
        <View className="flex-row items-center gap-2">
          <Animated.View
            className="rounded-md h-2 w-2"
            style={[{ backgroundColor: textPrimary }, dot1Style]}
          />
          <Animated.View
            className="rounded-md h-2 w-2"
            style={[{ backgroundColor: textPrimary }, dot2Style]}
          />
          <Animated.View
            className="rounded-md h-2 w-2"
            style={[{ backgroundColor: textPrimary }, dot3Style]}
          />
          {!compact ? (
            <Text className="text-xs ml-1 text-tertiary">{t.chat.thinkingIndicator}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
