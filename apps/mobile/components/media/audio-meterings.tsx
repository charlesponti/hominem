import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '~/theme';

// Constants for normalization
const MIN_DB = -50; // Minimum decibel level
const MAX_DB = 0; // Maximum decibel level (0 dB is the loudest)
const MIN_HEIGHT = 7; // Minimum height in pixels
const MAX_HEIGHT = 50; // Maximum height in pixels

// Improved normalization function
const normalizeDb = (db: number): number => {
  const clampedDb = Math.max(MIN_DB, Math.min(MAX_DB, db));
  const normalizedValue = (clampedDb - MIN_DB) / (MAX_DB - MIN_DB);
  // console.log({
  //   db,
  //   clampedDb,
  //   normalizedValue,
  //   height: MIN_HEIGHT + normalizedValue * (MAX_HEIGHT - MIN_HEIGHT),
  // });
  return MIN_HEIGHT + normalizedValue * (MAX_HEIGHT - MIN_HEIGHT);
};

// Hook to memoize normalization results
export const useNormalizedLevels = (levels: number[]) => {
  return useMemo(() => levels.map(normalizeDb), [levels]);
};

// Animated bar component
const AudioMeterings = ({ height }: { height: number }) => {
  return <View style={[styles.bar, { height, backgroundColor: theme.colors.foreground }]} />;
  // return <Animated.View style={[styles.bar, animatedStyles]} />;
};

// Component to render the audio levels
export const AudioLevelVisualizer: React.FC<{ levels: number[] }> = ({ levels }) => {
  const normalizedLevels = useNormalizedLevels(levels);

  return (
    <View style={styles.container}>
      {normalizedLevels.map((height, index) => (
        <AudioMeterings key={index} height={height} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: MAX_HEIGHT,
    backgroundColor: theme.colors['emphasis-faint'],
    borderRadius: 12,
    columnGap: 5,
  },
  bar: {
    width: 3,
    borderRadius: 25,
  },
});
