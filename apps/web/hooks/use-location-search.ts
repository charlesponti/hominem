import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { GeocodeFeature } from '@ponti/utils/location'

interface UseLocationSearchOptions {
  initialValue?: string
}
export function useLocationSearch({ initialValue }: UseLocationSearchOptions) {
  const [query, setQuery] = useState<string>(initialValue || '')

  const locationSearch = useQuery<GeocodeFeature[]>({
    queryKey: ['locations', query],
    queryFn: async () => {
      if (!query) {
        return []
      }

      try {
        const response = await fetch(`/api/location?query=${encodeURIComponent(query)}`)
        const features = (await response.json()) as GeocodeFeature[]

        return features
      } catch (error) {
        console.error('Error searching locations:', error)
        return []
      }
    },
    enabled: !!query,
  })

  return { query, setQuery, locationSearch }
}
