import NetInfo from '@react-native-community/netinfo';

import { API_BASE_URL } from '~/utils/constants';

type GetAuthHeaders = () => Promise<Record<string, string>>;

export function getMobileChatEndpoint(chatId: string): string {
  return `${API_BASE_URL}/api/chats/${chatId}/ui/send`;
}

export function createMobileChatFetch(getAuthHeaders: GetAuthHeaders) {
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const authHeaders = await getAuthHeaders();
    for (const [key, value] of Object.entries(authHeaders)) {
      headers.set(key, value);
    }

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    headers.set('X-Transport', 'mobile-ai-sdk');
    headers.set('X-Idempotency-Key', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };
  return fetchFn as unknown as typeof fetch;
}

async function _isNetworkConnected() {
  const status = await NetInfo.fetch();
  return Boolean(status.isConnected);
}
