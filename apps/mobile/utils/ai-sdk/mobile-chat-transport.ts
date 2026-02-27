import NetInfo from '@react-native-community/netinfo'

import { API_BASE_URL } from '~/utils/constants'

type GetAccessToken = () => Promise<string | null>

export function getMobileChatEndpoint(chatId: string): string {
  return `${API_BASE_URL}/api/chats/${chatId}/ui/send`
}

export function createMobileChatFetch(getAccessToken: GetAccessToken) {
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = await getAccessToken()
    const headers = new Headers(init?.headers)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    headers.set('X-Transport', 'mobile-ai-sdk')
    headers.set('X-Idempotency-Key', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

    return fetch(input, {
      ...init,
      headers,
    })
  }
  return fetchFn as unknown as typeof fetch
}

export async function isNetworkConnected() {
  const status = await NetInfo.fetch()
  return Boolean(status.isConnected)
}
