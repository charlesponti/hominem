import {
  createGenerationClientState,
  parseGenerationClientCheckpoint,
  parseGenerationWireEvent,
  reduceGenerationClientEvent,
  type GenerationClientState,
} from '@hominem/chat';
import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { storage } from '~/services/storage/mmkv';

import type { ChatGenerationState } from './chat-generation';
import { consumeGenerationSseXhr } from './consume-sse-xhr';

const resumingGenerationIds = new Set<string>();

function generationStorageKey(chatId: string) {
  return `chat-generation:${chatId}`;
}

function restoreGeneration(chatId: string): ChatGenerationState | null {
  const raw = storage.getString(generationStorageKey(chatId));
  if (!raw) {
    return null;
  }
  try {
    const checkpoint = parseGenerationClientCheckpoint(JSON.parse(raw));
    return {
      id: checkpoint.generationId,
      chatId,
      stage: toStageFromPhase(checkpoint.phase),
      lastDurableSequence: checkpoint.lastDurableSequence,
    };
  } catch {
    storage.remove(generationStorageKey(chatId));
    return null;
  }
}

function toStageFromPhase(
  phase: ReturnType<typeof parseGenerationClientCheckpoint>['phase'],
): ChatGenerationState['stage'] {
  return phase === 'cancel_requested' ? 'stopping' : phase;
}

function toClientPhase(stage: ChatGenerationState['stage']): GenerationClientState['phase'] {
  return stage === 'stopping' ? 'cancel_requested' : stage;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(restoreGeneration(chatId));
  const [generation, setGenerationState] = useState<ChatGenerationState | null>(
    generationRef.current,
  );

  const setGeneration = useCallback(
    (next: ChatGenerationState | null) => {
      generationRef.current = next;
      setGenerationState(next);
      const key = generationStorageKey(chatId);
      if (!next) {
        storage.remove(key);
        return;
      }
      const checkpoint = parseGenerationClientCheckpoint({
        generationId: next.id,
        phase: next.stage === 'stopping' ? 'cancel_requested' : next.stage,
        lastDurableSequence: next.lastDurableSequence,
      });
      storage.set(key, JSON.stringify(checkpoint));
    },
    [chatId],
  );

  const resumeGeneration = useCallback(async () => {
    const current = generationRef.current;
    if (
      !current ||
      ['committed', 'cancelled', 'failed'].includes(current.stage) ||
      resumingGenerationIds.has(current.id)
    ) {
      return;
    }
    resumingGenerationIds.add(current.id);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let clientState: GenerationClientState = {
      ...createGenerationClientState(current.id),
      phase: toClientPhase(current.stage),
      lastDurableSequence: current.lastDurableSequence,
    };
    try {
      await consumeGenerationSseXhr({
        url: `${API_BASE_URL}/api/chats/${chatId}/generations/${current.id}/stream?afterSequence=${current.lastDurableSequence}`,
        payload: null,
        method: 'GET',
        replayUrl: (afterSequence) =>
          `${API_BASE_URL}/api/chats/${chatId}/generations/${current.id}/stream?afterSequence=${afterSequence}`,
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        parseEvent: parseGenerationWireEvent,
        getReplayCursor: () => clientState.lastDurableSequence,
        onEvent: (event) => {
          clientState = reduceGenerationClientEvent(clientState, event);
          const latest = generationRef.current;
          if (!latest || latest.id !== current.id) {
            return;
          }
          if (['committed', 'cancelled', 'failed'].includes(clientState.phase)) {
            setGeneration(null);
            void onGenerationTerminal?.();
            return;
          }
          setGeneration({
            ...latest,
            stage: toStageFromPhase(clientState.phase),
            lastDurableSequence: clientState.lastDurableSequence,
          });
        },
      });
    } finally {
      resumingGenerationIds.delete(current.id);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [chatId, getAuthHeaders, onGenerationTerminal, setGeneration]);

  useEffect(() => {
    if (!generationRef.current) {
      return;
    }
    void resumeGeneration().catch(() => undefined);
  }, [resumeGeneration]);

  const cancelGeneration = useCallback(async () => {
    const current = generationRef.current;
    if (!current || current.stage === 'stopping') {
      return;
    }

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

  return {
    abortControllerRef,
    cancelGeneration,
    generation,
    generationRef,
    resumeGeneration,
    setGeneration,
  };
}
