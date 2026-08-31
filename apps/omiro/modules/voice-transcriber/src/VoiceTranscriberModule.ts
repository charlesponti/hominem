import { requireNativeModule } from 'expo';

// Must stay in sync with the `code` values thrown by VoiceTranscriberException
// in VoiceTranscriberModule.swift -- that's the only other place these
// strings are defined, so a typo on either side would silently break routing.
export const VoiceTranscriberErrorCode = {
  INVALID_AUDIO_URL: 'INVALID_AUDIO_URL',
  RECOGNIZER_UNAVAILABLE: 'RECOGNIZER_UNAVAILABLE',
  MISSING_PERMISSION: 'MISSING_PERMISSION',
  EMPTY_TRANSCRIPT: 'EMPTY_TRANSCRIPT',
} as const;

export type SpeechRecognitionPermissionStatus =
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'restricted';

export interface VoiceTranscriptionResult {
  rawText: string;
  locale: string;
  engine: 'speech-analyzer';
  isOnDevice: true;
}

export type VoiceTranscriberModuleType = {
  getPermissions(): Promise<SpeechRecognitionPermissionStatus>;
  requestPermissions(): Promise<SpeechRecognitionPermissionStatus>;
  transcribeFile(audioUri: string): Promise<VoiceTranscriptionResult>;
};

export default requireNativeModule<VoiceTranscriberModuleType>('VoiceTranscriber');
