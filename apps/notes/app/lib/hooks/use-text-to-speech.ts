import { useCallback, useRef, useState } from 'react'

export interface TTSState {
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
  currentAudio: string | null
}

export interface UseTextToSpeechReturn {
  state: TTSState
  speak: (text: string, voice?: string, speed?: number) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    currentAudio: null,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentAbortControllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    // Abort any pending request
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort()
      currentAbortControllerRef.current = null
    }

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isSpeaking: false,
      isLoading: false,
      currentAudio: null,
    }))
  }, [])

  const speak = useCallback(
    async (text: string, voice = 'alloy', speed = 1.0): Promise<void> => {
      // Stop any current speech
      stop()

      if (!text.trim()) {
        return
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      try {
        // Create abort controller for this request
        const abortController = new AbortController()
        currentAbortControllerRef.current = abortController

        // Generate speech via API
        const response = await fetch('/api/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice, speed }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate speech')
        }

        const result = await response.json()

        if (abortController.signal.aborted) {
          return
        }

        // Create audio element and play
        const audio = new Audio(result.audio.url)
        audioRef.current = audio

        audio.onloadstart = () => {
          setState((prev) => ({ ...prev, isLoading: true }))
        }

        audio.oncanplaythrough = () => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isSpeaking: true,
            currentAudio: result.audio.url,
          }))
        }

        audio.onended = () => {
          setState((prev) => ({
            ...prev,
            isSpeaking: false,
            currentAudio: null,
          }))
          audioRef.current = null
        }

        audio.onerror = () => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            error: 'Failed to play audio',
            currentAudio: null,
          }))
          audioRef.current = null
        }

        // Start playing
        await audio.play()
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, ignore
          return
        }

        console.error('Text-to-speech error:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSpeaking: false,
          error: error instanceof Error ? error.message : 'Failed to generate speech',
          currentAudio: null,
        }))
      }
    },
    [
      // Stop any current speech
      stop,
    ]
  )

  const pause = useCallback(() => {
    if (audioRef.current && state.isSpeaking) {
      audioRef.current.pause()
      setState((prev) => ({ ...prev, isSpeaking: false }))
    }
  }, [state.isSpeaking])

  const resume = useCallback(() => {
    if (audioRef.current && !state.isSpeaking && state.currentAudio) {
      audioRef.current.play()
      setState((prev) => ({ ...prev, isSpeaking: true }))
    }
  }, [state.isSpeaking, state.currentAudio])

  return {
    state,
    speak,
    stop,
    pause,
    resume,
  }
}
