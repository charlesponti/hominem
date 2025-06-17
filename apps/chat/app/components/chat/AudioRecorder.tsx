import { useState, useCallback } from 'react'
import { Button } from '~/components/ui/button.js'
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAudioRecorder, formatDuration } from '~/lib/hooks/use-audio-recorder.js'
import { AudioPlayer } from './AudioPlayer.js'

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, transcription?: string) => void
  onTranscription?: (text: string) => void
  autoTranscribe?: boolean
  showPlayer?: boolean
  className?: string
}

export function AudioRecorder({ 
  onRecordingComplete,
  onTranscription,
  autoTranscribe = true,
  showPlayer = true,
  className = ''
}: AudioRecorderProps) {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<string>('')
  const [transcriptionError, setTranscriptionError] = useState<string>('')

  const {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    downloadRecording
  } = useAudioRecorder()

  const handleStartRecording = useCallback(async () => {
    setTranscription('')
    setTranscriptionError('')
    await startRecording()
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    stopRecording()
    
    // Auto-transcribe if enabled
    if (autoTranscribe && state.audioBlob) {
      await transcribeAudio(state.audioBlob)
    }
  }, [stopRecording, autoTranscribe, state.audioBlob])

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob) return

    setIsTranscribing(true)
    setTranscriptionError('')

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setTranscription(result.transcription.text)
        onTranscription?.(result.transcription.text)
      } else {
        setTranscriptionError(result.error || 'Transcription failed')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      setTranscriptionError('Failed to transcribe audio')
    } finally {
      setIsTranscribing(false)
    }
  }, [onTranscription])

  const handleSendRecording = useCallback(() => {
    if (state.audioBlob) {
      onRecordingComplete?.(state.audioBlob, transcription)
      clearRecording()
      setTranscription('')
      setTranscriptionError('')
    }
  }, [state.audioBlob, transcription, onRecordingComplete, clearRecording])

  const handleRetryTranscription = useCallback(() => {
    if (state.audioBlob) {
      transcribeAudio(state.audioBlob)
    }
  }, [state.audioBlob, transcribeAudio])

  if (!state.isSupported) {
    return (
      <div className={`text-center p-4 text-muted-foreground ${className}`}>
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Audio recording is not supported in this browser.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Display */}
      {state.error && (
        <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Recording Status */}
      {state.isRecording && (
        <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {state.isPaused ? 'Recording Paused' : 'Recording'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDuration(state.duration)}
          </span>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-2">
        {!state.isRecording ? (
          <Button
            onClick={handleStartRecording}
            className="h-12 w-12 rounded-full"
            disabled={state.error !== null}
          >
            <Mic className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={state.isPaused ? resumeRecording : pauseRecording}
              className="h-10 w-10"
            >
              {state.isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleStopRecording}
              className="h-12 w-12 rounded-full"
            >
              <Square className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Recording Preview */}
      {state.audioBlob && state.audioUrl && (
        <div className="space-y-3">
          {/* Audio Player */}
          {showPlayer && (
            <AudioPlayer
              src={state.audioUrl}
              title={`Recording (${formatDuration(state.duration)})`}
              showDownload={false}
            />
          )}

          {/* Transcription Section */}
          {autoTranscribe && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transcription</span>
                {transcriptionError && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryTranscription}
                    disabled={isTranscribing}
                  >
                    Retry
                  </Button>
                )}
              </div>
              
              {isTranscribing ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Transcribing audio...</span>
                </div>
              ) : transcriptionError ? (
                <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{transcriptionError}</span>
                </div>
              ) : transcription ? (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{transcription}</p>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg text-muted-foreground">
                  <p className="text-sm">No transcription available</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadRecording}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecording}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            
            <Button
              onClick={handleSendRecording}
              disabled={!state.audioBlob}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Recording
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}