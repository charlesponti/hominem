import { useSupabaseAuthContext } from '@hominem/auth'
import { useCallback, useMemo, useState } from 'react'

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
  const { supabase } = useSupabaseAuthContext()
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
        const defaultHeaders: Record<string, string> = {}

        // Only set Content-Type for non-FormData requests
        if (!(body instanceof FormData)) {
          defaultHeaders['Content-Type'] = 'application/json'
        }

        // Verify user with Supabase Auth server before trusting session data
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.access_token) {
            defaultHeaders.Authorization = `Bearer ${session.access_token}`
          }
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers: {
            ...defaultHeaders,
            ...headers,
          },
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
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
    [supabase]
  )

  /**
   * API client methods for common operations - memoized to prevent infinite re-renders
   */
  const api = useMemo(
    () => ({
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
      ) =>
        fetchApi<T, Response>(endpoint, { ...options, method: 'POST', body: data, stream: true }),

      postFormData: <S>(
        endpoint: string,
        formData: FormData,
        options?: Omit<FetchOptions<FormData>, 'method'>
      ) => fetchApi<FormData, S>(endpoint, { ...options, method: 'POST', body: formData }),

      put: <T, S>(endpoint: string, data: T, options?: Omit<FetchOptions<T>, 'method'>) =>
        fetchApi<T, S>(endpoint, { ...options, method: 'PUT', body: data }),

      delete: <T, S>(endpoint: string, options?: Omit<FetchOptions<T>, 'method'>) =>
        // We add body because `fetchApi` use `application/json` as default content type
        fetchApi<T, S>(endpoint, { ...options, method: 'DELETE', body: {} as T }),
    }),
    [fetchApi]
  )

  return {
    ...api,
    isLoading: state.isLoading,
    error: state.error,
  }
}
