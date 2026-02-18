import { useMutation } from '@tanstack/react-query'

import { captureException } from '@sentry/react-native'
import { useAudioTranscribe } from './use-audio-transcribe'

import type { GeneratedIntentsResponse } from '~/components/notes/use-get-user-intent'

export type AudioUploadResponse = GeneratedIntentsResponse

export const useAudioUpload = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: AudioUploadResponse) => void
  onError?: () => void
}) => {
  const { mutateAsync: transcribe } = useAudioTranscribe()

  const mutation = useMutation<AudioUploadResponse, Error, string>({
    mutationFn: async (audioUri) => {
      const text = await transcribe(audioUri)
      return {
        output: text,
        chat: {
          output: text,
        },
      }
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.()
    },
  })

  return mutation
}
