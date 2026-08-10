import { useSyncExternalStore } from 'react';

import { storage, subscribeToStorageKey } from '~/services/storage/mmkv';

export type ChatResponseLength = 'short' | 'medium' | 'long';

export const CHAT_RESPONSE_LENGTHS: ChatResponseLength[] = ['short', 'medium', 'long'];

const RESPONSE_LENGTH_KEY = 'chat_response_length';
const DEFAULT_RESPONSE_LENGTH: ChatResponseLength = 'medium';

function isChatResponseLength(value: string | undefined): value is ChatResponseLength {
  return value === 'short' || value === 'medium' || value === 'long';
}

export function getChatResponseLength(): ChatResponseLength {
  const stored = storage.getString(RESPONSE_LENGTH_KEY);
  return isChatResponseLength(stored) ? stored : DEFAULT_RESPONSE_LENGTH;
}

export function setChatResponseLength(value: ChatResponseLength) {
  storage.set(RESPONSE_LENGTH_KEY, value);
}

export function useChatResponseLength() {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStorageKey(RESPONSE_LENGTH_KEY, onStoreChange),
    getChatResponseLength,
    getChatResponseLength,
  );
}
