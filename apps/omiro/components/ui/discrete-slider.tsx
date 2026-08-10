import { useCallback, useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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
  const [borderDefault, textPrimary] = useCSSVariable(['--color-border', '--color-foreground']) as [
    string,
    string,
  ];
  const trackWidth = useSharedValue(0);
  const [measuredTrackWidth, setMeasuredTrackWidth] = useState(0);
  const position = useSharedValue(steps > 1 ? value / (steps - 1) : 0);

  useEffect(() => {
    position.value = steps > 1 ? value / (steps - 1) : 0;
  }, [position, steps, value]);

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
      commitStep(index);
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

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const current = Math.min(steps - 1, Math.max(0, value));
      if (event.nativeEvent.actionName === 'increment' && current < steps - 1) {
        setStepFromFraction((current + 1) / Math.max(1, steps - 1));
      }
      if (event.nativeEvent.actionName === 'decrement' && current > 0) {
        setStepFromFraction((current - 1) / Math.max(1, steps - 1));
      }
    },
    [setStepFromFraction, steps, value],
  );

  return (
    <View
      className="h-6 justify-center"
      onLayout={handleLayout}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: steps - 1, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
    >
      <View
        className="absolute left-3 right-3 h-1 rounded-full"
        style={{ backgroundColor: borderDefault }}
      />
      <Reanimated.View
        className="absolute left-3 h-1 rounded-full"
        style={[{ backgroundColor: textPrimary, top: (THUMB_SIZE - TRACK_HEIGHT) / 2 }, fillStyle]}
      />
      {Array.from({ length: steps }, (_, index) => (
        <Pressable
          key={index}
          hitSlop={12}
          onPress={() => setStepFromFraction(steps > 1 ? index / (steps - 1) : 0)}
          style={[
            {
              borderRadius: 2,
              height: TRACK_HEIGHT,
              position: 'absolute',
              top: (THUMB_SIZE - TRACK_HEIGHT) / 2,
              width: TRACK_HEIGHT,
            },
            {
              left:
                THUMB_SIZE / 2 - 2 + (steps > 1 ? (index / (steps - 1)) * measuredTrackWidth : 0),
              backgroundColor: borderDefault,
            },
          ]}
        />
      ))}
      <GestureDetector gesture={pan}>
        <Reanimated.View
          className="h-6 w-6 rounded-full"
          style={[{ backgroundColor: textPrimary }, thumbStyle]}
        />
      </GestureDetector>
    </View>
  );
}
