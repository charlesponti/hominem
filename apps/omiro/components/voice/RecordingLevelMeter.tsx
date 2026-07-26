import React, { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { getRecordingSnapshot, subscribeRecording } from '~/components/media/audio.service';
import { makeStyles, useThemeColors } from '~/components/theme';
import { spacing } from '~/components/theme/tokens';

const BAR_COUNT = 24;
const BAR_MAX_HEIGHT = 20;
const BAR_MIN_HEIGHT = 3;

// iOS AVAudioRecorder metering is dBFS, roughly -160 (silence) to 0 (max
// possible). These bounds are a starting perceptual mapping tuned for normal
// speaking volume — recalibrate against real on-device readings if the meter
// looks too flat or too twitchy in practice.
const DB_FLOOR = -50;
const DB_CEILING = -5;

function normalizeDb(db: number): number {
  const clamped = Math.min(DB_CEILING, Math.max(DB_FLOOR, db));
  return (clamped - DB_FLOOR) / (DB_CEILING - DB_FLOOR);
}

interface LevelBarProps {
  db: number;
  tintColor: string;
}

function LevelBar({ db, tintColor }: LevelBarProps) {
  const styles = useStyles();
  const level = useSharedValue(0);

  useEffect(() => {
    level.value = withTiming(normalizeDb(db), { duration: 120 });
  }, [db, level]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: BAR_MIN_HEIGHT + level.value * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT),
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: tintColor }, animatedStyle]} />;
}

export function RecordingLevelMeter() {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const meterings = useSyncExternalStore(
    subscribeRecording,
    () => getRecordingSnapshot().meterings,
    () => getRecordingSnapshot().meterings,
  );

  const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
    const sourceIndex = meterings.length - BAR_COUNT + index;
    return sourceIndex >= 0 ? meterings[sourceIndex] : DB_FLOOR;
  });

  return (
    <View style={styles.row}>
      {bars.map((db, index) => (
        <LevelBar key={index} db={db} tintColor={themeColors.accent} />
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[1] / 2,
    height: BAR_MAX_HEIGHT,
    width: '100%',
  },
  bar: {
    flex: 1,
    maxWidth: 3,
    borderRadius: 2,
  },
}));
