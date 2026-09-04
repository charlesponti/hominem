import { ChatClient } from '@hominem/chat/client';
import type { GenerationClientState } from '@hominem/chat/client';
import { fetchChatTransport } from '@hominem/chat/transport/fetch';
import { useRef } from 'react';

function createCheckpointStore() {
  const storage = typeof window === 'undefined' ? undefined : window.localStorage;
  return {
    get: (generationId: string): GenerationClientState | null => {
      if (!storage) return null;
      const raw = storage.getItem(`chat-generation:${generationId}`);
      return raw ? (JSON.parse(raw) as GenerationClientState) : null;
    },
    set: (state: GenerationClientState) => {
      storage?.setItem(`chat-generation:${state.generationId}`, JSON.stringify(state));
    },
    remove: (generationId: string) => storage?.removeItem(`chat-generation:${generationId}`),
  };
}

export function useChatClient() {
  const clientRef = useRef<ChatClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new ChatClient({
      baseUrl: import.meta.env.VITE_PUBLIC_API_URL,
      transport: fetchChatTransport((input, init) =>
        fetch(input, { ...init, credentials: 'include' }),
      ),
      checkpointStore: createCheckpointStore(),
    });
  }
  return clientRef.current;
}
