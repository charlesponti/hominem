import { useCallback, useRef, useState } from 'react';

import { API_BASE_URL } from '~/constants';

import type { ChatGenerationState } from './chat-generation';

interface UseChatGenerationOptions {
  chatId: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export function useChatGeneration({ chatId, getAuthHeaders }: UseChatGenerationOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(null);
  const [generation, setGenerationState] = useState<ChatGenerationState | null>(null);

  const setGeneration = useCallback((next: ChatGenerationState | null) => {
    generationRef.current = next;
    setGenerationState(next);
  }, []);

  const cancelGeneration = useCallback(async () => {
    const current = generationRef.current;
    if (!current || current.stage === 'stopping') return;

    setGeneration({ ...current, stage: 'stopping' });
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${chatId}/generations/${current.id}/cancel`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
      },
    );

    if (!response.ok) {
      setGeneration({ ...current, stage: 'failed', error: 'Unable to stop reply.' });
      return;
    }

    abortControllerRef.current?.abort();
    setGeneration({ ...current, stage: 'cancelled' });
  }, [chatId, getAuthHeaders, setGeneration]);

  return { abortControllerRef, cancelGeneration, generation, generationRef, setGeneration };
}
