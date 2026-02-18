import { captureException } from '@sentry/react-native'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import * as FileSystem from 'expo-file-system'
import type { components } from '~/utils/api-types'
import { useAuthenticatedRequest } from '~/utils/use-authenticated-request'

export type GeneratedIntentsResponse = components['schemas']['GeneratedIntentsResponse']
export type CreateIntents = GeneratedIntentsResponse['create']
export type SearchIntents = GeneratedIntentsResponse['search']

export const useGetUserIntent = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: GeneratedIntentsResponse) => void
  onError?: (error: AxiosError) => void
}) => {
  const authRequest = useAuthenticatedRequest()

  const audioIntentMutation = useMutation<GeneratedIntentsResponse, AxiosError, string>({
    mutationFn: async (fileUri: string) => {
      const audioFile = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const { data } = await authRequest<GeneratedIntentsResponse>({
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
      onError?.(error)
    },
  })

  const textIntentMutation = useMutation<GeneratedIntentsResponse, AxiosError, string>({
    mutationFn: async (content: string) => {
      const { data } = await authRequest<GeneratedIntentsResponse>({
        url: '/sherpa/text',
        method: 'POST',
        data: { content },
      })

      return data
    },
    onSuccess,
    onError: (error) => {
      captureException(error)
      onError?.(error)
    },
  })

  return { audioIntentMutation, textIntentMutation }
}
