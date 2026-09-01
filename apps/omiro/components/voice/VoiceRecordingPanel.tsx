import React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme, useStyles } from '~/components/theme';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';
import { RecordingLevelMeter } from '~/components/voice/RecordingLevelMeter';
import { useElapsedTimer } from '~/components/voice/useElapsedTimer';
import t from '~/translations';

interface VoiceRecordingPanelProps {
  startedAt: number | null;
  onCancel: () => void;
  onDone?: () => void;
  doneAccessibilityLabel?: string;
  // 'sending' covers the gap between a walkie-talkie auto-send and the
  // spoken reply arriving -- recording's already stopped, nothing left to
  // cancel or stop, so those controls just hide.
  phase?: 'recording' | 'sending';
}

export function VoiceRecordingPanel({
  startedAt,
  onCancel,
  onDone,
  doneAccessibilityLabel,
  phase = 'recording',
}: VoiceRecordingPanelProps) {
  const {
    card: cardColor,
    destructive: destructiveColor,
    mutedForeground: textSecondaryColor,
  } = useAppTheme().colors;
  const styles = useStyles(() => ({
    sendingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
    sendingContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    recordingDot: { width: 8, height: 8, borderRadius: 999 },
    recordingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
    recordingContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    meterContainer: { flex: 1 },
  }));
  const elapsed = useElapsedTimer(startedAt);
  const dotOpacity = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    ),
  }));

  if (phase === 'sending') {
    return (
      <View style={styles.sendingContainer}>
        <View
          style={[
            styles.sendingContent,
            {
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: cardColor,
            },
          ]}
        >
          <Animated.View
            style={[styles.recordingDot, [{ backgroundColor: destructiveColor }, dotOpacity]]}
          />
          <Text
            style={{
              color: textSecondaryColor,
              fontSize: 13,
              fontVariant: ['tabular-nums'],
              minWidth: 34,
            }}
          >
            {t.inboxComposer.composer.sendingA11y}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.recordingContainer}>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.cancelRecordingA11y}
        testID="composer-cancel-recording-button"
        onPress={onCancel}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
      {/* Fills the row between cancel and stop, mirroring the idle row's
          [attach] [text, flex-1] [mic] layout. */}
      <View
        style={[
          styles.recordingContent,
          {
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 22,
            backgroundColor: cardColor,
          },
        ]}
      >
        <Animated.View
          style={[styles.recordingDot, [{ backgroundColor: destructiveColor }, dotOpacity]]}
        />
        <Text
          style={{
            color: textSecondaryColor,
            fontSize: 13,
            fontVariant: ['tabular-nums'],
            minWidth: 34,
          }}
        >
          {elapsed}
        </Text>
        <View style={styles.meterContainer}>
          <RecordingLevelMeter />
        </View>
      </View>
      {onDone ? (
        <IconButton
          accessibilityLabel={doneAccessibilityLabel ?? t.inboxComposer.composer.stopVoiceInputA11y}
          testID="composer-stop-recording-button"
          onPress={onDone}
        >
          <AppIcon name="stop.fill" size={20} />
        </IconButton>
      ) : null}
    </View>
  );
}
