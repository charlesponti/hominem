import { MaterialIcons } from '@expo/vector-icons';
import { captureException } from '@sentry/react-native';
import type { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { AudioLevelVisualizer } from './audio-meterings'
import type { Recordings } from './recordings-list'

export default function AudioRecorder({
  multi,
  onStartRecording,
  onStopRecording,
  style,
  ...props
}: PressableProps & {
  multi?: boolean;
  onStartRecording: () => void;
  onStopRecording: (note: string | null) => void;
}) {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [meterings, setMeterings] = useState<number[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<Audio.RecordingStatus>();
  const [recordings, setRecordings] = useState<Recordings>([]);

  const onRecordingStatusChange = useCallback((status: Audio.RecordingStatus) => {
    setRecordingStatus(status);
    const { metering } = status;
    if (status.isRecording && metering !== undefined) {
      setMeterings((current) => [...current, metering]);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { Audio } = await import('expo-av');
      // Prevent the user's device from sleeping while they are recording.'
      activateKeepAwakeAsync().catch(() => captureException(new Error('Failed to keep awake.')));

      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Create recorder
        const recording = new Audio.Recording();

        // Prepare the recorder
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

        // Start recording
        recording.startAsync();

        recording.setOnRecordingStatusUpdate(onRecordingStatusChange);
        setRecording(recording);
        onStartRecording();
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [onStartRecording, onRecordingStatusChange]);

  const handleMultipleRecordings = useCallback(
    async (fileUri: string) => {
      if (multi && recording) {
        const updatedRecordings = [...recordings];
        const { sound } = await recording.createNewLoadedSoundAsync();
        updatedRecordings.push({
          sound: sound,
          duration: recordingStatus?.durationMillis,
          file: fileUri,
        });
        setRecordings(updatedRecordings);
      }
    },
    [multi, recording, recordingStatus?.durationMillis, recordings]
  );

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    /**
     * This function error is caught because the user may possibly quick-click
     * the stop button, causing the following to occuring after the recording has already stopped.
     */
    await recording.stopAndUnloadAsync().catch((reason) => {
      captureException(reason);
    });

    // Prevent the user's device from staying awake after they are done recording.
    deactivateKeepAwake().catch(() =>
      captureException(new Error('Failed to deactivate keep awake.'))
    );

    const file = recording.getURI();

    if (multi && file) {
      handleMultipleRecordings(file);
    }

    if (file) {
      setRecordingStatus(undefined); // Clear recording status
      setRecording(undefined); // Clear recording
      setMeterings([]); // Clear meterings
      onStopRecording(file);
    }
  }, [multi, recording, handleMultipleRecordings]);

  const backgroundColor = useSharedValue(0)
  const speakButtonBackground = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundColor.value,
      [0, 1],
      [theme.colors.muted, theme.colors.destructive]
    ),
  }))

  useEffect(() => {
    backgroundColor.value = withTiming(recordingStatus?.isRecording ? 1 : 0, {
      duration: VOID_MOTION_DURATION_STANDARD,
    })
  }, [backgroundColor, recordingStatus?.isRecording])

  return (
    <View style={[styles.container]}>
      <AnimatedPressable
        style={[pressableStyles.speakButton, speakButtonBackground]}
        onPress={recording ? stopRecording : startRecording}
        {...props}>
        {recordingStatus?.isRecording ? (
          <MaterialIcons name="stop" size={24} color={theme.colors.foreground} />
        ) : null}
        {!recordingStatus?.isRecording ? (
          <MaterialIcons name="mic" size={24} color={theme.colors.foreground} />
        ) : null}
      </AnimatedPressable>
      {recordingStatus?.isRecording ? <AudioLevelVisualizer levels={meterings} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 24,
  },
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const pressableStyles = StyleSheet.create({
  speakButton: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
})
