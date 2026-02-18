import type { PressableProps } from 'react-native'

import { MobileVoiceInput } from './mobile-voice-input'

export default function AudioRecorder({
  onStartRecording,
  onStopRecording,
  ...props
}: PressableProps & {
  multi?: boolean
  onStartRecording: () => void
  onStopRecording: (note: string | null) => void
}) {
  return (
    <MobileVoiceInput
      autoTranscribe={false}
      onAudioReady={onStopRecording}
      onError={() => onStopRecording(null)}
      onRecordingStateChange={(isRecording) => {
        if (isRecording) {
          onStartRecording()
        }
      }}
      {...props}
    />
  )
}
