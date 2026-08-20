import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
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
  // spoken reply arriving — recording has already stopped, there's nothing
  // left to cancel or stop, so those controls are hidden.
  phase?: 'recording' | 'sending';
}

export function VoiceRecordingPanel({
  startedAt,
  onCancel,
  onDone,
  doneAccessibilityLabel,
  phase = 'recording',
}: VoiceRecordingPanelProps) {
  const [cardColor, destructiveColor, textSecondaryColor] = useThemeColor([
    '--color-card',
    '--color-destructive',
    '--color-muted-foreground',
  ]) as string[];
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
      <View style={styles.s0}>
        <View
          style={[
            styles.s1,
            {
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: cardColor,
            },
          ]}
        >
          <Animated.View style={[styles.s2, [{ backgroundColor: destructiveColor }, dotOpacity]]} />
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
    <View style={styles.s3}>
      <IconButton
        accessibilityLabel={t.inboxComposer.composer.cancelRecordingA11y}
        testID="composer-cancel-recording-button"
        onPress={onCancel}
      >
        <AppIcon name="xmark" size={20} />
      </IconButton>
      {/* Fills the entire row between the cancel and stop buttons, mirroring the
          idle row's [attach] [text, flex-1] [mic] geometry. */}
      <View
        style={[
          styles.s4,
          {
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 22,
            backgroundColor: cardColor,
          },
        ]}
      >
        <Animated.View style={[styles.s5, [{ backgroundColor: destructiveColor }, dotOpacity]]} />
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
        <View style={styles.s6}>
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

const styles = makeStyles((theme) => ({
  s0: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  s1: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  s2: { width: 8, height: 8, borderRadius: 999 },
  s3: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  s4: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  s5: { width: 8, height: 8, borderRadius: 999 },
  s6: { flex: 1 },
}));
