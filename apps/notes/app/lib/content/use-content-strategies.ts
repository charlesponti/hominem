import { useCallback, useState } from 'react'

export function useContentStrategies() {
  const [isLoading, setIsLoading] = useState(false)

  const get = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      return { id, title: 'Sample Strategy', content: 'Sample content' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    get,
    isLoading,
  }
}
