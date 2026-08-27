import { useEffect } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColor } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

const MOVE_EASING = Easing.bezier(0.77, 0, 0.175, 1);

interface SegmentedControlOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Overrides for the track/label colors. Native header slots (e.g. a
   * `headerTitle` custom view) can resolve this app's DynamicColorIOS-based
   * theme colors against the wrong system appearance, so screens that render
   * this control there should pass explicit colors instead of relying on
   * useThemeColor.
   */
  trackColor?: string;
  activeColor?: string;
  inactiveColor?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
  style,
  trackColor,
  activeColor,
  inactiveColor,
}: SegmentedControlProps<T>) {
  const [themePrimary, themeMutedForeground] = useThemeColor([
    '--color-primary',
    '--color-muted-foreground',
  ]) as string[];
  const primary = activeColor ?? themePrimary;
  const mutedForeground = inactiveColor ?? themeMutedForeground;
  const reducedMotion = useReducedMotion();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  );
  const progress = useSharedValue(selectedIndex);

  useEffect(() => {
    progress.value = reducedMotion
      ? selectedIndex
      : withTiming(selectedIndex, { duration: 200, easing: MOVE_EASING });
  }, [selectedIndex, reducedMotion, progress]);

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${(progress.value / options.length) * 100}%`,
  }));

  return (
    <View
      style={[styles.control, trackColor ? { backgroundColor: trackColor } : null, style]}
      testID={testID}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          { backgroundColor: primary, width: `${100 / options.length}%` },
          thumbStyle,
        ]}
      />
      {options.map((option) => {
        const isSelected = option.key === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={option.key}
            onPress={() => onChange(option.key)}
            style={styles.segment}
            testID={testID ? `${testID}-${option.key}` : undefined}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, { color: isSelected ? primary : mutedForeground }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.popover,
    borderRadius: 10,
    padding: 2,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 8,
    opacity: 0.15,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  label: { fontSize: 13, fontWeight: '600' },
}));
