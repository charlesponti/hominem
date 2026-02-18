import { useCallback } from 'react'

import { useAuth } from './auth-provider'
import { API_BASE_URL } from './constants'

type RequestOptions = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  data?: unknown
}

export const useAuthenticatedRequest = () => {
  const { getAccessToken } = useAuth()

  return useCallback(
    async <T>(options: RequestOptions): Promise<{ data: T }> => {
      const token = await getAccessToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}${options.url}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.data ? JSON.stringify(options.data) : undefined,
      })

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }

      const data = (await response.json()) as T
      return { data }
    },
    [getAccessToken]
  )
}
