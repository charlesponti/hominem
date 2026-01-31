import type { GeocodeFeature } from '@hominem/utils/location';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface UseLocationSearchOptions {
  initialValue?: string | undefined;
}
export function useLocationSearch({ initialValue }: UseLocationSearchOptions) {
  const [query, setQuery] = useState<string>(initialValue || '');

  const locationSearch = useQuery<GeocodeFeature[]>({
    queryKey: ['locations', query],
    queryFn: async () => {
      if (!query) {
        return [];
      }

      try {
        const response = await fetch(`/api/location?query=${encodeURIComponent(query)}`);
        const features = (await response.json()) as GeocodeFeature[];

        return features;
      } catch (error) {
        console.error('Error searching locations:', error);
        return [];
      }
    },
    enabled: !!query,
  });

  return { query, setQuery, locationSearch };
}
