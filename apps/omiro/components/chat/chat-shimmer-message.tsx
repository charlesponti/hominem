import { transitionDurations } from '@ponti-studios/ui/tokens';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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
  const cardBg = useCSSVariable('color-card') as string;
  const popoverBg = useCSSVariable('color-popover') as string;
  const animatedStyle = usePulse();

  if (variant === 'user') {
    return (
      <Animated.View
        className="px-4 py-3 w-full rounded-lg gap-2"
        style={[{ borderCurve: 'continuous', backgroundColor: popoverBg }, animatedStyle]}
      >
        <View className="rounded-md h-4 w-full" style={{ backgroundColor: cardBg }} />
        <View className="rounded-md h-4 w-2/3" style={{ backgroundColor: cardBg }} />
      </Animated.View>
    );
  }

  return (
    <View className="px-4 py-3 w-full">
      <View className="flex-1 gap-2">
        <Animated.View
          className="rounded-md h-4 w-full"
          style={[{ backgroundColor: cardBg }, animatedStyle]}
        />
        <Animated.View
          className="rounded-md h-4 w-2/3"
          style={[{ backgroundColor: cardBg }, animatedStyle]}
        />
      </View>
    </View>
  );
}
