import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Vibration,
  View,
  type PressableProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, Text, theme } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';

import { AudioLevelVisualizer } from './audio-meterings';
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
      Vibration.vibrate(40);
      await stopRecording();
      onRecordingStateChange?.(false);
      return;
    }

    Vibration.vibrate(20);
    await startRecording();
    onRecordingStateChange?.(true);
  }, [isRecording, onRecordingStateChange, startRecording, stopRecording]);

  const backgroundColor = useSharedValue(0);
  const speakButtonBackground = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      [theme.colors.muted, theme.colors.destructive],
    ),
  }));

  useEffect(() => {
    backgroundColor.value = withTiming(isRecording ? 1 : 0, {
      duration: VOID_MOTION_DURATION_STANDARD,
    });
  }, [backgroundColor, isRecording]);

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
          <MaterialIcons name="stop" size={24} color={theme.colors.foreground} />
        ) : null}
        {!isTranscribing && !isRecording ? (
          <MaterialIcons name="mic" size={24} color={theme.colors.foreground} />
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
      borderRadius: 50,
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
