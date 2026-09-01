import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme, useStyles } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from '~/services/motion/native-motion';

const PULSE_LOW_OPACITY = 0.35;
const SKELETON_WIDTHS = ['100%', '92%', '68%'] as const;

interface NoteDraftPreviewProps {
  text: string;
  isLoading: boolean;
  testID?: string;
}

// Preview surface built for long-form content -- unlike a composer draft (a
// sentence or two), this can be a whole essay, so it's a bounded, scrollable
// text block instead of one giant heading. Pulses skeleton bars while
// loading, then crossfades into the real content once it's ready.
export function NoteDraftPreview({ text, isLoading, testID }: NoteDraftPreviewProps) {
  const { foreground, muted, popover } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    container: { borderRadius: 12, flex: 1, padding: 12 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    skeleton: { gap: 10 },
    skeletonBar: { borderRadius: 6, height: 14 },
    text: { ...theme.textVariants.body },
  }));
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(isLoading ? 1 : 0);

  useEffect(() => {
    cancelAnimation(opacity);

    if (reducedMotion) {
      opacity.value = 1;
      return;
    }

    if (isLoading) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(PULSE_LOW_OPACITY, nativeMotionTiming.enter),
          withTiming(1, nativeMotionTiming.enter),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = 0;
      opacity.value = withTiming(1, nativeMotionTiming.enter);
    }

    return () => cancelAnimation(opacity);
  }, [isLoading, reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: popover }, animatedStyle]}
      testID={testID}
    >
      {isLoading ? (
        <View style={styles.skeleton}>
          {SKELETON_WIDTHS.map((width) => (
            <View key={width} style={[styles.skeletonBar, { backgroundColor: muted, width }]} />
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Text style={[styles.text, { color: foreground }]}>{text}</Text>
        </ScrollView>
      )}
    </Animated.View>
  );
}
