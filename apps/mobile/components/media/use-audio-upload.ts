import { captureException } from '@sentry/react-native'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import * as FileSystem from 'expo-file-system'
import { components } from '~/utils/api-types'
import { useAuthenticatedRequest } from '~/utils/use-authenticated-request'

export type AudioUploadResponse = components["schemas"]["GeneratedIntentsResponse"]

export const useAudioUpload = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: AudioUploadResponse) => void
  onError?: () => void
}) => {
  const authRequest = useAuthenticatedRequest()

  const mutation = useMutation<AudioUploadResponse, AxiosError, string>({
    mutationFn: async (fileUri: string) => {
      const audioFile = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const { data } = await authRequest<AudioUploadResponse>({
        url: '/sherpa/voice',
        method: 'POST',
        data: {
          filename: 'audio.m4a',
          audio_data: audioFile,
        },
      })

      return data
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.()
    },
  })

  return mutation
}
