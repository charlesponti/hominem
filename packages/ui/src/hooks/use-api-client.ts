import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useMemo, useState } from 'react'

type ApiClientConfig = {
  apiUrl?: string
  supabaseClient: SupabaseClient
}

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
 * React hook for API client that handles fetch requests with Supabase authentication
 */
export function useApiClient(config: ApiClientConfig) {
  const [state, setState] = useState<ApiState>({
    isLoading: false,
    error: null,
  })

  const apiUrl = config.apiUrl
  const supabase = config.supabaseClient

  const fetchApi = useCallback(
    async <T, S>(endpoint: string, options: FetchOptions<T> = {}): Promise<S> => {
      const { method = 'GET', body, headers = {}, stream = false } = options
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const defaultHeaders: Record<string, string> = {}

        if (!(body instanceof FormData)) {
          defaultHeaders['Content-Type'] = 'application/json'
        }

        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.access_token) {
            defaultHeaders.Authorization = `Bearer ${session.access_token}`
          }
        }

        const res = await fetch(`${apiUrl}${endpoint}`, {
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
          const errorMessage = error.message || `HTTP ${res.status}: ${res.statusText}`
          const errorWithStatus = new Error(errorMessage)
          ;(errorWithStatus as Error & { status: number }).status = res.status
          throw errorWithStatus
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
    [apiUrl, supabase]
  )

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
