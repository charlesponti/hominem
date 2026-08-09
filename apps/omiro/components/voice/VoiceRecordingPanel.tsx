import { IconButton } from '@ponti-studios/ui/native';
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

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
  const [cardColor, destructiveColor, textSecondaryColor] = useCSSVariable([
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
      <View className="flex-row items-center gap-2 w-full">
        <View
          className="flex-1 flex-row items-center gap-2"
          style={{
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 22,
            backgroundColor: cardColor,
          }}
        >
          <Animated.View
            className="w-2 h-2 rounded-full"
            style={[{ backgroundColor: destructiveColor }, dotOpacity]}
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
    <View className="flex-row items-center gap-2 w-full">
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
        className="flex-1 flex-row items-center gap-2"
        style={{
          height: 44,
          paddingHorizontal: 16,
          borderRadius: 22,
          backgroundColor: cardColor,
        }}
      >
        <Animated.View
          className="w-2 h-2 rounded-full"
          style={[{ backgroundColor: destructiveColor }, dotOpacity]}
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
        <View className="flex-1">
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
