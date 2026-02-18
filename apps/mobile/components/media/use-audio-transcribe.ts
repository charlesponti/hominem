import { captureException } from '@sentry/react-native'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import * as FileSystem from 'expo-file-system'

import { useAuthenticatedRequest } from '~/utils/use-authenticated-request'

export const useAudioTranscribe = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: string) => void
  onError?: () => void
}) => {
  const authRequest = useAuthenticatedRequest()

  const mutation = useMutation<string, AxiosError, string>({
    mutationFn: async (fileUri: string) => {
      const audioFile = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const { data } = await authRequest<string>({
        url: '/sherpa/audio/transcribe',
        method: 'POST',
        data: {
          filename: 'audio.m4a',
          audio_data: audioFile,
        },
      })

      return data.trim()
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.()
    },
  })

  return mutation
}
