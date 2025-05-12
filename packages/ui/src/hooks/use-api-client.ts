import { useAuth } from '@clerk/react-router'
import { useCallback, useState } from 'react'

const API_URL = import.meta.env.VITE_PUBLIC_API_URL

type FetchOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: T
  headers?: Record<string, string>
  stream?: boolean
}

type ApiState = {
  isLoading: boolean
  error: Error | null
}

/**
 * React hook for API client that handles fetch requests with authentication
 */
export function useApiClient() {
  const { getToken } = useAuth()
  const [state, setState] = useState<ApiState>({
    isLoading: false,
    error: null,
  })

  /**
   * Base fetch function with authentication
   */
  const fetchApi = useCallback(
    async <T, S>(endpoint: string, options: FetchOptions<T> = {}): Promise<S> => {
      const { method = 'GET', body, headers = {}, stream = false } = options
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // Default headers
        const defaultHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Get token from Clerk client-side
        const token = await getToken()
        if (token) {
          defaultHeaders.Authorization = `Bearer ${token}`
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers: {
            ...defaultHeaders,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.message || 'An error occurred')
        }

        if (stream) {
          setState((prev) => ({ ...prev, isLoading: false }))
          return res as unknown as S
        }

        const data = (await res.json()) as S
        setState((prev) => ({ ...prev, isLoading: false }))
        return data
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('An unknown error occurred'),
        }))
        throw error
      }
    },
    [getToken]
  )

  /**
   * API client methods for common operations
   */
  const api = {
    get: <body, returnType>(
      endpoint: string,
      options?: Omit<FetchOptions<body>, 'method' | 'body'>
    ) => fetchApi<body, returnType>(endpoint, { ...options, method: 'GET' }),

    post: <T, S>(endpoint: string, data?: T, options?: Omit<FetchOptions<T>, 'method'>) =>
      fetchApi<T, S>(endpoint, { ...options, method: 'POST', body: data }),

    postStream: <T>(
      endpoint: string,
      data: T,
      options?: Omit<FetchOptions<T>, 'method' | 'stream'>
    ) => fetchApi<T, Response>(endpoint, { ...options, method: 'POST', body: data, stream: true }),

    put: <T, S>(endpoint: string, data: T, options?: Omit<FetchOptions<T>, 'method'>) =>
      fetchApi<T, S>(endpoint, { ...options, method: 'PUT', body: data }),

    delete: <T, S>(endpoint: string, options?: Omit<FetchOptions<T>, 'method'>) =>
      // We add body because `fetchApi` use `application/json` as default content type
      fetchApi<T, S>(endpoint, { ...options, method: 'DELETE', body: {} as T }),
  }

  return {
    ...api,
    isLoading: state.isLoading,
    error: state.error,
  }
}
