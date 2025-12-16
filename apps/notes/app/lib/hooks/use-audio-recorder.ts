import { useCallback, useRef, useState } from 'react'

export interface AudioRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  stream: MediaStream | null
  isSupported: boolean
  error: string | null
}

export interface UseAudioRecorderReturn {
  state: AudioRecordingState
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
  downloadRecording: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    stream: null,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    error: null,
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current
      setState((prev) => ({ ...prev, duration: Math.floor(elapsed / 1000) }))
    }
  }, [])

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Clear any previous error
      setState((prev) => ({ ...prev, error: null }))

      // Check if already recording
      if (state.isRecording) {
        return
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      })

      streamRef.current = stream
      chunksRef.current = []

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      // Update state with stream for waveform visualization
      setState((prev) => ({ ...prev, stream }))

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: 'audio/webm;codecs=opus',
        })
        const audioUrl = URL.createObjectURL(audioBlob)

        setState((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          stream: null, // Clear stream when recording stops
          isRecording: false,
          isPaused: false,
        }))

        // Clean up
        if (streamRef.current) {
          for (const track of streamRef.current.getTracks()) {
            track.stop()
          }
          streamRef.current = null
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setState((prev) => ({
          ...prev,
          error: 'Recording failed. Please try again.',
          isRecording: false,
          isPaused: false,
        }))
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0

      setState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }))

      // Start duration timer
      intervalRef.current = setInterval(updateDuration, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)

      let errorMessage = 'Failed to access microphone.'
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Microphone access denied. Please allow microphone permissions.'
            break
          case 'NotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone.'
            break
          case 'NotSupportedError':
            errorMessage = 'Audio recording not supported in this browser.'
            break
          default:
            errorMessage = `Recording error: ${error.message}`
        }
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
        isPaused: false,
      }))
    }
  }, [state.isRecording, updateDuration])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [state.isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause()
      pausedTimeRef.current += Date.now() - startTimeRef.current

      setState((prev) => ({ ...prev, isPaused: true }))

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isRecording, state.isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now()

      setState((prev) => ({ ...prev, isPaused: false }))

      intervalRef.current = setInterval(updateDuration, 1000)
    }
  }, [state.isRecording, state.isPaused, updateDuration])

  const clearRecording = useCallback(() => {
    // Stop recording if active
    if (state.isRecording) {
      stopRecording()
    }

    // Clean up blob URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }

    // Reset state
    setState((prev) => ({
      ...prev,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      stream: null,
      error: null,
    }))

    // Clear refs
    chunksRef.current = []
    startTimeRef.current = 0
    pausedTimeRef.current = 0
  }, [state.isRecording, state.audioUrl, stopRecording])

  const downloadRecording = useCallback(() => {
    if (state.audioBlob && state.audioUrl) {
      const link = document.createElement('a')
      link.href = state.audioUrl
      link.download = `recording-${Date.now()}.webm`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [state.audioBlob, state.audioUrl])

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    downloadRecording,
  }
}

// Utility function to format duration
export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
