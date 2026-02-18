import { useMutation } from '@tanstack/react-query'

import { captureException } from '@sentry/react-native'

import type { GeneratedIntentsResponse } from '~/components/notes/use-get-user-intent'

export type AudioUploadResponse = GeneratedIntentsResponse

export const useAudioUpload = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: AudioUploadResponse) => void
  onError?: () => void
}) => {
  const mutation = useMutation<AudioUploadResponse, Error, string>({
    mutationFn: async () => {
      return {
        output: 'Audio upload is routed through Sherpa chat.',
        chat: {
          output: 'Voice intent parsing is disabled in this build. Continue in Sherpa chat.',
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
