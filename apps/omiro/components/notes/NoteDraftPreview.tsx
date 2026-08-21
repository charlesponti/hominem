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

import { makeStyles, useThemeColor } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from '~/services/motion/native-motion';

const PULSE_LOW_OPACITY = 0.35;
const SKELETON_WIDTHS = ['100%', '92%', '68%'] as const;

interface NoteDraftPreviewProps {
  text: string;
  isLoading: boolean;
  testID?: string;
}

// The long-form-safe preview surface for generated note content -- unlike a
// composer draft (a sentence or two), this can be an essay, so it renders as
// a bounded, scrollable body-text block rather than one giant centered
// heading. While loading, pulses skeleton bars instead of text that doesn't
// exist yet; once settled, crossfades into the real content.
export function NoteDraftPreview({ text, isLoading, testID }: NoteDraftPreviewProps) {
  const [foreground, muted, popover] = useThemeColor([
    '--color-foreground',
    '--color-muted',
    '--color-popover',
  ]) as string[];
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
            <View
              key={width}
              style={[styles.skeletonBar, { backgroundColor: muted, width }]}
            />
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

const styles = makeStyles((theme) => ({
  container: { borderRadius: 12, flex: 1, padding: 12 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  skeleton: { gap: 10 },
  skeletonBar: { borderRadius: 6, height: 14 },
  text: { ...theme.typography.body },
}));
