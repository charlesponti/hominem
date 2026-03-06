import { QueryClient, onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'

// Configure React Query to use NetInfo for online status
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Optimized for mobile: balance between freshness and battery/performance
      staleTime: 60_000, // 1 minute - data considered fresh for 1 min
      gcTime: 10 * 60_000, // 10 minutes - keep unused data in memory longer
      retry: (failureCount, error) => {
        // Exponential backoff: don't retry immediately
        if (failureCount > 3) return false
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Response && error.status >= 400 && error.status < 500) {
          return false
        }
        
        return true
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
})

export default queryClient
