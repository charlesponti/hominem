import { useCallback, useState } from 'react'

export function useGenerateTweet() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateTweet = useCallback(async (content: string) => {
    setIsGenerating(true)
    try {
      return { text: `Generated tweet: ${content}` }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generateTweet,
    isGenerating,
  }
}
