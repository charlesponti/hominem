import { ChatClient, parseGenerationClientCheckpoint } from '@hominem/chat/client';
import type { ChatGenerationController, GenerationClientState } from '@hominem/chat/client';
import { xhrChatTransport } from '@hominem/chat/transport/xhr';
import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { storage } from '~/services/storage/mmkv';

import type { ChatGenerationState } from './chat-generation';

const resumingGenerationIds = new Set<string>();

function generationStorageKey(id: string) {
  return `chat-generation:${id}`;
}

function restoreGeneration(chatId: string): ChatGenerationState | null {
  const raw = storage.getString(generationStorageKey(chatId));
  if (!raw) return null;
  try {
    const checkpoint = parseGenerationClientCheckpoint(JSON.parse(raw));
    return {
      id: checkpoint.generationId,
      chatId,
      stage: checkpoint.phase === 'cancel_requested' ? 'stopping' : checkpoint.phase,
      lastDurableSequence: checkpoint.lastDurableSequence,
    };
  } catch {
    storage.remove(generationStorageKey(chatId));
    return null;
  }
}

function checkpointStore(chatId: string) {
  return {
    get: (_id: string) => {
      const raw = storage.getString(generationStorageKey(chatId));
      return raw ? (JSON.parse(raw) as GenerationClientState) : null;
    },
    set: (state: GenerationClientState) =>
      storage.set(generationStorageKey(chatId), JSON.stringify(state)),
    remove: (_id: string) => {
      storage.remove(generationStorageKey(chatId));
    },
  };
}

interface UseChatGenerationOptions {
  chatId: string;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onGenerationTerminal?: () => void | Promise<void>;
}

export function useChatGeneration({
  chatId,
  getAuthHeaders,
  onGenerationTerminal,
}: UseChatGenerationOptions) {
  const clientRef = useRef<ChatClient | null>(null);
  const controllerRef = useRef<ChatGenerationController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(restoreGeneration(chatId));
  const [generation, setGenerationState] = useState(generationRef.current);
  if (!clientRef.current) {
    clientRef.current = new ChatClient({
      baseUrl: API_BASE_URL,
      headers: getAuthHeaders,
      transport: xhrChatTransport(),
      checkpointStore: checkpointStore(chatId),
    });
  }

  const setGeneration = useCallback(
    (next: ChatGenerationState | null) => {
      generationRef.current = next;
      setGenerationState(next);
      if (!next) {
        storage.remove(generationStorageKey(chatId));
        return;
      }
      storage.set(
        generationStorageKey(chatId),
        JSON.stringify({
          generationId: next.id,
          phase: next.stage === 'stopping' ? 'cancel_requested' : next.stage,
          lastDurableSequence: next.lastDurableSequence,
        }),
      );
    },
    [chatId],
  );

  const bindController = useCallback(
    (controller: ChatGenerationController, initial: ChatGenerationState) => {
      controllerRef.current = controller;
      setGeneration(initial);
      return controller.subscribe((state) => {
        const current = generationRef.current;
        if (!current || current.id !== state.generationId) return;
        if (state.phase === 'committed' || state.phase === 'cancelled') {
          queueMicrotask(() => {
            if (generationRef.current?.id !== state.generationId) return;
            setGeneration(null);
            void onGenerationTerminal?.();
          });
          return;
        }
        setGeneration({
          ...current,
          stage: state.phase === 'cancel_requested' ? 'stopping' : state.phase,
          lastDurableSequence: state.lastDurableSequence,
        });
      });
    },
    [onGenerationTerminal, setGeneration],
  );

  const sendGeneration = useCallback(
    (input: Parameters<ChatClient['send']>[0], initial: ChatGenerationState) => {
      const controller = clientRef.current!.send(input);
      bindController(controller, initial);
      return controller;
    },
    [bindController],
  );

  const regenerateGeneration = useCallback(
    (input: Parameters<ChatClient['regenerate']>[0], initial: ChatGenerationState) => {
      const controller = clientRef.current!.regenerate(input);
      bindController(controller, initial);
      return controller;
    },
    [bindController],
  );

  const resumeGeneration = useCallback(async () => {
    const current = generationRef.current;
    if (
      !current ||
      ['committed', 'cancelled', 'failed'].includes(current.stage) ||
      resumingGenerationIds.has(current.id)
    )
      return;
    resumingGenerationIds.add(current.id);
    const controller = clientRef.current!.resumeGeneration({
      chatId,
      generationId: current.id,
    });
    const unsubscribe = bindController(controller, current);
    try {
      await controller.done;
    } finally {
      unsubscribe();
      resumingGenerationIds.delete(current.id);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [bindController, chatId]);

  useEffect(() => {
    if (generationRef.current) void resumeGeneration().catch(() => undefined);
  }, [resumeGeneration]);

  const cancelGeneration = useCallback(async () => {
    const current = generationRef.current;
    const controller = controllerRef.current;
    if (!current || !controller || current.stage === 'stopping') return;
    setGeneration({ ...current, stage: 'stopping' });
    const response = await clientRef.current!.cancel({ chatId, generationId: current.id });
    if (!response.ok) {
      setGeneration({ ...current, stage: 'failed', error: 'Unable to stop reply.' });
      return;
    }
    controller.cancel();
    setGeneration({ ...current, stage: 'cancelled' });
  }, [chatId, setGeneration]);

  return {
    cancelGeneration,
    regenerateGeneration,
    sendGeneration,
    generation,
    generationRef,
    resumeGeneration,
    setGeneration,
  };
}
