import { createClient } from '@supabase/supabase-js'
import { useCallback, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_PUBLIC_API_URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client for browser usage
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

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
export function useSupabaseApiClient() {
  const [state, setState] = useState<ApiState>({
    isLoading: false,
    error: null,
  })

  /**
   * Base fetch function with Supabase authentication
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

        // Get token from Supabase session
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (session?.access_token) {
            defaultHeaders.Authorization = `Bearer ${session.access_token}`
          }
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers: { ...defaultHeaders, ...headers },
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`API Error: ${res.status} ${res.statusText} - ${errorText}`)
        }

        if (stream) {
          return res as unknown as S
        }

        // Handle empty responses
        const text = await res.text()
        if (!text) {
          return {} as S
        }

        try {
          return JSON.parse(text)
        } catch {
          return text as unknown as S
        }
      } catch (error) {
        const apiError = error instanceof Error ? error : new Error('Unknown API error')
        setState((prev) => ({ ...prev, error: apiError }))
        throw apiError
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    },
    []
  )

  /**
   * GET request
   */
  const get = useCallback(
    async <S>(endpoint: string, headers?: Record<string, string>): Promise<S> => {
      return fetchApi<undefined, S>(endpoint, { method: 'GET', headers })
    },
    [fetchApi]
  )

  /**
   * POST request
   */
  const post = useCallback(
    async <T, S>(endpoint: string, body?: T, headers?: Record<string, string>): Promise<S> => {
      return fetchApi<T, S>(endpoint, { method: 'POST', body, headers })
    },
    [fetchApi]
  )

  /**
   * PUT request
   */
  const put = useCallback(
    async <T, S>(endpoint: string, body?: T, headers?: Record<string, string>): Promise<S> => {
      return fetchApi<T, S>(endpoint, { method: 'PUT', body, headers })
    },
    [fetchApi]
  )

  /**
   * DELETE request
   */
  const del = useCallback(
    async <S>(endpoint: string, headers?: Record<string, string>): Promise<S> => {
      return fetchApi<undefined, S>(endpoint, { method: 'DELETE', headers })
    },
    [fetchApi]
  )

  /**
   * Stream request for chat/streaming responses
   */
  const stream = useCallback(
    async <T>(endpoint: string, body?: T, headers?: Record<string, string>): Promise<Response> => {
      return fetchApi<T, Response>(endpoint, { method: 'POST', body, headers, stream: true })
    },
    [fetchApi]
  )

  return useMemo(
    () => ({
      get,
      post,
      put,
      delete: del,
      stream,
      ...state,
    }),
    [get, post, put, del, stream, state]
  )
}
