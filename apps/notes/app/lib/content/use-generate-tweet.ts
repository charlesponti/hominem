import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '../../components/ui/use-toast'

interface GenerateTweetParams {
  content: string
  tone?: 'professional' | 'casual' | 'engaging' | 'informative'
  includeHashtags?: boolean
}

interface TweetResponse {
  text: string
  hashtags: string[]
  characterCount: number
}

export function useGenerateTweet() {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
  const { toast } = useToast()
  const [generatedTweet, setGeneratedTweet] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  const generateTweet = useMutation<TweetResponse, Error, GenerateTweetParams>({
    mutationFn: async (params) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to generate tweets.')
      }

      const response = await apiClient.post<GenerateTweetParams, TweetResponse>(
        '/api/ai/generate-tweet',
        params
      )

      if (!response) {
        throw new Error('Failed to generate tweet')
      }

      return response
    },
    onSuccess: (data) => {
      setGeneratedTweet(data.text)
      setIsEditing(true)
      toast({
        title: 'Tweet Generated',
        description: 'Your tweet has been generated successfully. You can edit it before posting.',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Tweet Generation Failed',
        description: error.message || 'Could not generate tweet. Please try again.',
      })
    },
  })

  const regenerateTweet = (params: GenerateTweetParams) => {
    generateTweet.mutate(params)
  }

  const updateTweet = (newText: string) => {
    setGeneratedTweet(newText)
  }

  const resetTweet = () => {
    setGeneratedTweet('')
    setIsEditing(false)
  }

  return {
    generateTweet: generateTweet.mutate,
    regenerateTweet,
    updateTweet,
    resetTweet,
    generatedTweet,
    isEditing,
    setIsEditing,
    isGenerating: generateTweet.isLoading,
    error: generateTweet.error,
  }
}
