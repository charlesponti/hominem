import { useCallback, useRef, useState } from 'react';

import type { ChatGenerationState } from './chat-generation';

interface UseChatGenerationOptions {
  chatId: string;
}

export function useChatGeneration({ chatId: _chatId }: UseChatGenerationOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(null);
  const [generation, setGenerationState] = useState<ChatGenerationState | null>(null);

  const setGeneration = useCallback((next: ChatGenerationState | null) => {
    generationRef.current = next;
    setGenerationState(next);
  }, []);

  return { abortControllerRef, generation, generationRef, setGeneration };
}
