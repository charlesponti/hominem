import type { PressableProps } from 'react-native'

import { MobileVoiceInput } from '../media/mobile-voice-input'

type AudioTranscriberProps = {
  onRecordingStateChange: (isRecording: boolean) => void
  onAudioTranscribed: (transcription: string) => void
  onError: () => void
} & PressableProps

export default function AudioTranscriber({
  onRecordingStateChange,
  onAudioTranscribed,
  onError,
  ...props
}: AudioTranscriberProps) {
  return (
    <MobileVoiceInput
      autoTranscribe
      onAudioTranscribed={onAudioTranscribed}
      onError={onError}
      onRecordingStateChange={onRecordingStateChange}
      {...props}
    />
  )
}
