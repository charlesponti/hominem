import { useMutation } from '@tanstack/react-query'

import { captureException } from '@sentry/react-native'

export const useAudioTranscribe = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: string) => void
  onError?: () => void
}) => {
  const mutation = useMutation<string, Error, string>({
    mutationFn: async () => {
      return 'Voice transcription is disabled in this build. Please type your message.'
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.()
    },
  })

  return mutation
}
