import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useDerivedValue, withSpring } from 'react-native-reanimated';

import { theme } from '~/theme';

import { BAR_WIDTH, buildAudioBarModels, normalizeDb } from './audio-meterings-model';

const MAX_HEIGHT = 50;
const BAR_RADIUS = 2;

export const useNormalizedLevels = (levels: number[]) =>
  useMemo(() => levels.map(normalizeDb), [levels]);

const SPRING_CONFIG = { damping: 12, stiffness: 180 };

// Single animated bar — Skia v2 accepts Reanimated SharedValues as props natively
const SkiaBar = ({
  targetHeight,
  x,
  color,
}: {
  targetHeight: number;
  x: number;
  color: string;
}) => {
  const animatedHeight = useDerivedValue(
    () => withSpring(targetHeight, SPRING_CONFIG),
    [targetHeight],
  );
  const animatedY = useDerivedValue(
    () => withSpring(MAX_HEIGHT - targetHeight, SPRING_CONFIG),
    [targetHeight],
  );

  return (
    <RoundedRect
      x={x}
      // Skia v2 accepts SharedValue<number> directly at runtime; cast for TS
      y={animatedY as unknown as number}
      width={BAR_WIDTH}
      height={animatedHeight as unknown as number}
      r={BAR_RADIUS}
      color={color}
    />
  );
};

export const AudioLevelVisualizer: React.FC<{ levels: number[] }> = ({ levels }) => {
  const bars = useMemo(() => buildAudioBarModels(levels), [levels]);
  const canvasWidth = bars.length > 0 ? bars.at(-1)!.x + BAR_WIDTH : 0;
  const color = theme.colors.foreground;

  return (
    <View style={[styles.container, { width: canvasWidth }]}>
      <Canvas style={{ width: canvasWidth, height: MAX_HEIGHT }}>
        {bars.map((bar) => (
          <SkiaBar key={bar.key} targetHeight={bar.targetHeight} x={bar.x} color={color} />
        ))}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Keep Animated re-export for any callers that use it
export { Animated };
