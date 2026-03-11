import { useAudioPlayer } from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'
import { useCallback, useRef, useState } from 'react'
import { useApiClient } from '@hominem/hono-client/react'

type TTSState = 'idle' | 'loading' | 'playing' | 'error'

interface UseTTSOptions {
  voice?: string
  speed?: number
}

export function useTTS(options: UseTTSOptions = {}) {
  const client = useApiClient()
  const [state, setState] = useState<TTSState>('idle')
  const [error, setError] = useState<string | null>(null)
  const player = useAudioPlayer(null)
  const abortRef = useRef<AbortController | null>(null)

  const speak = useCallback(
    async (text: string) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setError(null)
      setState('loading')

      try {
        const buffer = await client.mobile.speech({
          text,
          voice: options.voice ?? 'alloy',
          speed: options.speed ?? 1,
        })

        if (controller.signal.aborted) return

        // Write the audio buffer to a temp file so expo-audio can play it
        const uri = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`
        await FileSystem.writeAsStringAsync(
          uri,
          Buffer.from(buffer).toString('base64'),
          { encoding: FileSystem.EncodingType.Base64 },
        )

        if (controller.signal.aborted) return

        setState('playing')
        player.replace({ uri })
        player.play()
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Speech playback failed')
        setState('error')
      }
    },
    [client, options.voice, options.speed, player],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    player.pause()
    setState('idle')
  }, [player])

  return { speak, stop, state, error }
}
