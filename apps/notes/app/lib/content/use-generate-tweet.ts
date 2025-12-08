import { useState } from 'react'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { trpc } from '~/lib/trpc'

interface GenerateTweetParams {
  content: string
  strategyType: 'default' | 'custom'
  strategy: string
}

export function useGenerateTweet() {
  const [generatedTweet, setGeneratedTweet] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  const generateMutation = trpc.tweet.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedTweet(data.text)
    },
    onError: (error) => {
      toast({
        title: 'Error generating tweet',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const generateTweet = (params: GenerateTweetParams) => {
    generateMutation.mutate(params)
  }

  const regenerateTweet = (params: GenerateTweetParams) => {
    generateMutation.mutate(params)
  }

  const updateTweet = (text: string) => {
    setGeneratedTweet(text)
  }

  const resetTweet = () => {
    setGeneratedTweet('')
    setIsEditing(false)
  }

  return {
    generateTweet,
    regenerateTweet,
    updateTweet,
    resetTweet,
    generatedTweet,
    isEditing,
    setIsEditing,
    isGenerating: generateMutation.isPending,
  }
}
