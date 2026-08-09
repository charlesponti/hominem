import { transitionDurations } from '@ponti-studios/ui/tokens';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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
  const textPrimary = useCSSVariable('color-foreground') as string;
  const dot1Style = useBounceDot(0);
  const dot2Style = useBounceDot(STAGGER_OFFSET);
  const dot3Style = useBounceDot(STAGGER_OFFSET * 2);

  return (
    <View className="px-4 py-2">
      <View className="gap-2 w-full">
        <View className="flex-row items-center gap-2">
          <Animated.View
            className="rounded-md h-2 w-2 opacity-65"
            style={[{ backgroundColor: textPrimary }, dot1Style]}
          />
          <Animated.View
            className="rounded-md h-2 w-2 opacity-65"
            style={[{ backgroundColor: textPrimary }, dot2Style]}
          />
          <Animated.View
            className="rounded-md h-2 w-2 opacity-65"
            style={[{ backgroundColor: textPrimary }, dot3Style]}
          />
          <Text className="text-xs ml-1 text-tertiary">{t.chat.thinkingIndicator}</Text>
        </View>
      </View>
    </View>
  );
}
