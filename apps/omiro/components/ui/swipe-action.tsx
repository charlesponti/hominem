import { memo } from 'react';
import { Pressable, type ColorValue, type ViewStyle } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import AppIcon, { type IconProps } from '~/components/ui/icon';

interface SwipeActionProps {
  progress: SharedValue<number>;
  iconName: IconProps['name'];
  accessibilityLabel: string;
  backgroundColor: ColorValue;
  onPress: () => void;
  width?: number;
  iconSize?: number;
  iconTintColor?: ColorValue;
  translateOffset?: number;
  style?: ViewStyle;
}

export const SwipeAction = memo(
  ({
    progress,
    iconName,
    accessibilityLabel,
    backgroundColor,
    onPress,
    width = 72,
    iconSize = 20,
    iconTintColor = 'white',
    translateOffset = 24,
    style,
  }: SwipeActionProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      const clampedProgress = Math.min(progress.value, 1);

      return {
        opacity: interpolate(
          clampedProgress,
          [0, 0.2, 0.65, 1],
          [0, 0, 0.7, 1],
          Extrapolation.CLAMP,
        ),
        transform: [
          {
            translateX: interpolate(
              clampedProgress,
              [0, 1],
              [translateOffset, 0],
              Extrapolation.CLAMP,
            ),
          },
          {
            scale: interpolate(clampedProgress, [0, 1], [0.92, 1], Extrapolation.CLAMP),
          },
        ],
      };
    }, [progress, translateOffset]);

    return (
      <Reanimated.View
        className="h-full"
        style={[{ backgroundColor, width }, style, animatedStyle]}
      >
        <Pressable
          className="items-center flex-1 justify-center"
          onPress={onPress}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          <AppIcon name={iconName} size={iconSize} tintColor={iconTintColor} />
        </Pressable>
      </Reanimated.View>
    );
  },
);

SwipeAction.displayName = 'SwipeAction';
