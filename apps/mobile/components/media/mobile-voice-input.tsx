import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, Text, theme } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';

import { AudioLevelVisualizer } from './audio-meterings';
import AppIcon from '../ui/icon';
import { useMobileAudioRecorder } from './use-mobile-audio-recorder';

type MobileVoiceInputProps = PressableProps & {
  autoTranscribe?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onAudioReady?: (audioUri: string) => void;
  onAudioTranscribed?: (transcription: string) => void;
  onError?: () => void;
};

export function MobileVoiceInput({
  autoTranscribe = false,
  onRecordingStateChange,
  onAudioReady,
  onAudioTranscribed,
  onError,
  style,
  ...props
}: MobileVoiceInputProps) {
  const styles = useStyles();
  const {
    isRecording,
    isTranscribing,
    meterings,
    hasRetryRecording,
    startRecording,
    stopRecording,
    retryTranscription,
    clearRecording,
  } = useMobileAudioRecorder({
    autoTranscribe,
    onAudioReady,
    onAudioTranscribed,
    onError,
  });

  const onPress = useCallback(async () => {
    if (isRecording) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await stopRecording();
      onRecordingStateChange?.(false);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
    onRecordingStateChange?.(true);
  }, [isRecording, onRecordingStateChange, startRecording, stopRecording]);

  const recordingProgress = useDerivedValue(
    () =>
      withTiming(isRecording ? 1 : 0, {
        duration: VOID_MOTION_DURATION_STANDARD,
      }),
    [isRecording],
  );

  const speakButtonBackground = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      recordingProgress.value,
      [0, 1],
      [theme.colors.muted, theme.colors.destructive],
    ),
  }));

  return (
    <View style={styles.container} testID="voice-input">
      {isRecording ? <AudioLevelVisualizer levels={meterings} /> : null}
      <AnimatedPressable
        disabled={isTranscribing}
        style={[styles.speakButton, speakButtonBackground, style]}
        onPress={() => {
          void onPress();
        }}
        accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice recording'}
        accessibilityHint={
          isRecording ? 'Tap to stop and transcribe' : 'Tap to record a voice message'
        }
        accessibilityRole="button"
        testID={isRecording ? 'voice-stop-button' : 'voice-start-button'}
        {...props}
      >
        {isTranscribing ? <ActivityIndicator size="small" color={theme.colors.foreground} /> : null}
        {!isTranscribing && isRecording ? (
          <AppIcon name="stop" size={24} color={theme.colors.foreground} useSymbol />
        ) : null}
        {!isTranscribing && !isRecording ? (
          <AppIcon name="microphone" size={24} color={theme.colors.foreground} useSymbol />
        ) : null}
      </AnimatedPressable>
      {hasRetryRecording && autoTranscribe ? (
        <Pressable onPress={() => void retryTranscription()} style={styles.retryButton}>
          <Text variant="body" color="text-secondary">
            RETRY
          </Text>
        </Pressable>
      ) : null}
      {hasRetryRecording && autoTranscribe ? (
        <Pressable onPress={clearRecording} style={styles.retryButton}>
          <Text variant="body" color="text-secondary">
            CLEAR
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_12,
    },
    speakButton: {
      padding: t.spacing.sm_8,
      borderRadius: t.borderRadii.full,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    retryButton: {
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      paddingHorizontal: t.spacing.sm_8,
      paddingVertical: t.spacing.xs_4,
    },
  }),
);
