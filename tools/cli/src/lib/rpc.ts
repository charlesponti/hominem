import type { AppType } from '@hominem/hono-rpc'

import { hc } from 'hono/client'

import { getValidAccessToken } from '../utils/auth-utils'

// Create the typed Hono RPC client
// Type is inferred directly from hc<AppType>
export const rpc = hc<AppType>('http://localhost:4040', {
  fetch: async (input: string | URL, init?: RequestInit) => {
    const token = await getValidAccessToken()
    if (!token) {
      throw new Error('No token found. Please run `hominem auth` to authenticate.')
    }
    const headers = new Headers(init?.headers)

    headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    })

    // Throw on non-OK responses so error handling works
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Request failed' }))) as {
        error?: string
      }
      const errorMessage = errorData.error || `Request failed with status ${response.status}`
      throw new Error(errorMessage)
    }

    return response
  },
})

// Legacy alias for backward compatibility
export const honoClient = rpc
