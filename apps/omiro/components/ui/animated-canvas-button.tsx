import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColor } from '~/components/theme';

interface AnimatedCanvasButtonProps extends Pick<ViewProps, 'children' | 'style'> {
  progress: number;
  height?: number;
  borderRadius?: number;
}

const DEFAULT_HEIGHT = 44;
const DEFAULT_BORDER_RADIUS = 6;

export function AnimatedCanvasButton({
  children,
  progress,
  height = DEFAULT_HEIGHT,
  borderRadius = DEFAULT_BORDER_RADIUS,
  style,
}: AnimatedCanvasButtonProps) {
  const [primary, mutedForeground] = useThemeColor([
    '--color-primary',
    '--color-muted-foreground',
  ]) as string[];
  const [width, setWidth] = React.useState(0);
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const borderPath = React.useMemo(() => {
    if (width === 0) return null;
    const path = Skia.Path.Make();
    path.addRRect(
      {
        rect: { x: 1, y: 1, width: width - 2, height: height - 2 },
        rx: borderRadius,
        ry: borderRadius,
      },
      false,
    );
    return path;
  }, [borderRadius, height, width]);

  const drawProgress = useSharedValue(clampedProgress);
  React.useEffect(() => {
    drawProgress.value = withTiming(clampedProgress, { duration: 300 });
  }, [clampedProgress, drawProgress]);

  const strokeColor = useDerivedValue(() =>
    interpolateColor(drawProgress.value, [0, 1], [mutedForeground, primary]),
  );
  const borderStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(clampedProgress === 1 ? 0 : 1, { duration: 200 }),
    }),
    [clampedProgress],
  );

  return (
    <View
      style={[
        {
          position: 'relative',
          width: '100%',
          height,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {clampedProgress < 1 && borderPath ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width, height }, borderStyle]}
        >
          <Canvas style={{ width, height }}>
            <Path
              path={borderPath}
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
              color={strokeColor}
              start={0}
              end={drawProgress}
            />
          </Canvas>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}
