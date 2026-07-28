import React from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text, componentSizes, makeStyles } from '~/components/theme';
import { spacing } from '~/components/theme/tokens';
import { IconButton } from '~/components/ui/icon-button';
import { RecordingLevelMeter } from '~/components/voice/RecordingLevelMeter';
import { useElapsedTimer } from '~/components/voice/useElapsedTimer';
import t from '~/translations';

interface VoiceRecordingPanelProps {
  startedAt: number | null;
  onCancel: () => void;
  onDone?: () => void;
  doneAccessibilityLabel?: string;
}

export function VoiceRecordingPanel({
  startedAt,
  onCancel,
  onDone,
  doneAccessibilityLabel,
}: VoiceRecordingPanelProps) {
  const styles = useStyles();
  const elapsed = useElapsedTimer(startedAt);
  const dotOpacity = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ),
  }));

  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.cancelRecordingA11y}
        icon="xmark"
        testID="composer-cancel-recording-button"
        onPress={onCancel}
      />
      {/* Fills the entire row between the cancel and stop buttons, mirroring the
          idle row's [attach] [text, flex-1] [mic] geometry. */}
      <View style={styles.visualizer}>
        <Animated.View style={[styles.dot, dotOpacity]} />
        <Text style={styles.timer}>{elapsed}</Text>
        <View style={styles.meter}>
          <RecordingLevelMeter />
        </View>
      </View>
      {onDone ? (
        <IconButton
          accessibilityLabel={doneAccessibilityLabel ?? t.inboxComposer.composer.stopVoiceInputA11y}
          icon="stop.fill"
          testID="composer-stop-recording-button"
          onPress={onDone}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    width: '100%',
  },
  visualizer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: componentSizes.xl,
    paddingHorizontal: spacing[3],
    borderRadius: componentSizes.xl / 2,
    backgroundColor: theme.colors['card'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.destructive,
  },
  timer: {
    color: theme.colors['text-secondary'],
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
  },
  meter: {
    flex: 1,
  },
}));
