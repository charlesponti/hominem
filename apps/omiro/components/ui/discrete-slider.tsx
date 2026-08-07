import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColors } from '~/components/theme';

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;

interface DiscreteSliderProps {
  /** Index of the selected stop. */
  value: number;
  /** Number of stops the thumb can rest on (evenly spaced). */
  steps: number;
  onValueChange: (index: number) => void;
  accessibilityLabel?: string;
}

const useStyles = makeStyles(() => ({
  container: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    borderRadius: TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    left: THUMB_SIZE / 2,
    position: 'absolute',
    right: THUMB_SIZE / 2,
  },
  fill: {
    borderRadius: TRACK_HEIGHT / 2,
    bottom: 0,
    height: TRACK_HEIGHT,
    left: THUMB_SIZE / 2,
    position: 'absolute',
  },
  stopDot: {
    borderRadius: 2,
    height: 4,
    position: 'absolute',
    top: (THUMB_SIZE - TRACK_HEIGHT) / 2,
    width: 4,
  },
  thumb: {
    borderRadius: THUMB_SIZE / 2,
    height: THUMB_SIZE,
    position: 'absolute',
    width: THUMB_SIZE,
  },
}));

function nearestStep(fraction: number, steps: number): number {
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (steps - 1));
}

/** A draggable, snap-to-stop slider for a small set of discrete values. */
export function DiscreteSlider({
  value,
  steps,
  onValueChange,
  accessibilityLabel,
}: DiscreteSliderProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const trackWidth = useSharedValue(0);
  const [measuredTrackWidth, setMeasuredTrackWidth] = useState(0);
  const position = useSharedValue(steps > 1 ? value / (steps - 1) : 0);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = Math.max(0, event.nativeEvent.layout.width - THUMB_SIZE);
      trackWidth.value = width;
      setMeasuredTrackWidth(width);
    },
    [trackWidth],
  );

  const commitStep = useCallback(
    (index: number) => {
      onValueChange(index);
    },
    [onValueChange],
  );

  const setStepFromFraction = useCallback(
    (fraction: number) => {
      const index = nearestStep(fraction, steps);
      position.value = withTiming(steps > 1 ? index / (steps - 1) : 0, { duration: 150 });
      runOnJS(commitStep)(index);
    },
    [commitStep, position, steps],
  );

  const pan = Gesture.Pan()
    .onChange((event) => {
      if (trackWidth.value <= 0) return;
      const next = position.value + event.changeX / trackWidth.value;
      position.value = Math.min(1, Math.max(0, next));
    })
    .onEnd(() => {
      runOnJS(setStepFromFraction)(position.value);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * trackWidth.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: position.value * trackWidth.value + THUMB_SIZE / 2,
  }));

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: steps - 1, now: value }}
    >
      <View style={[styles.track, { backgroundColor: themeColors['border-default'] }]} />
      <Reanimated.View
        style={[styles.fill, { backgroundColor: themeColors['text-primary'] }, fillStyle]}
      />
      {Array.from({ length: steps }, (_, index) => (
        <Pressable
          key={index}
          hitSlop={12}
          onPress={() => setStepFromFraction(steps > 1 ? index / (steps - 1) : 0)}
          style={[
            styles.stopDot,
            {
              left:
                THUMB_SIZE / 2 - 2 + (steps > 1 ? (index / (steps - 1)) * measuredTrackWidth : 0),
              backgroundColor: themeColors['border-default'],
            },
          ]}
        />
      ))}
      <GestureDetector gesture={pan}>
        <Reanimated.View
          style={[styles.thumb, { backgroundColor: themeColors['text-primary'] }, thumbStyle]}
        />
      </GestureDetector>
    </View>
  );
}
