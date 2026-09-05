// @vitest-environment jsdom
import type { GenerationEvent } from '@hominem/chat';
import type { ChatMessageDto } from '@hominem/rpc/types';
import { waitFor } from '@testing-library/react';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatGenerationState } from '~/services/chat/chat-generation';
import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';
import { renderHookWithQueryClient } from '../../utils/render-hook';

const {
  mockAbortControllerRef,
  mockCancelGeneration,
  mockConsumeSseXhr,
  mockGenerationRef,
  mockGetAuthHeaders,
  mockRandomUUID,
} = vi.hoisted(() => {
  const mockAbortControllerRef: { current: AbortController | null } = { current: null };
  const mockGenerationRef: { current: ChatGenerationState | null } = { current: null };
  return {
    mockAbortControllerRef,
    mockCancelGeneration: vi.fn(),
    mockConsumeSseXhr: vi.fn(),
    mockCreateGeneration: vi.fn(),
    mockGenerationRef,
    mockGetAuthHeaders: vi.fn().mockResolvedValue({}),
    mockRandomUUID: vi.fn(),
  };
});

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());
vi.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
vi.mock('~/services/auth/auth-provider', () => ({
  useAuth: () => ({ getAuthHeaders: mockGetAuthHeaders }),
}));
vi.mock('~/services/chat/use-chat-generation', () => ({
  useChatGeneration: () => {
    const [generation, setGenerationState] = useState<ChatGenerationState | null>(
      mockGenerationRef.current,
    );
    const createMockGeneration = (initial: ChatGenerationState) => {
      mockGenerationRef.current = initial;
      let listener:
        | ((
            state: { phase: ChatGenerationState['stage']; lastDurableSequence: number },
            event: GenerationEvent,
          ) => void)
        | null = null;
      let currentPhase = initial.stage;
      return {
        subscribe: (next: typeof listener) => {
          listener = next;
          return () => {
            listener = null;
          };
        },
        start: async () => {
          await mockConsumeSseXhr({
            onEvent: (event: GenerationEvent) => {
              const phase: ChatGenerationState['stage'] =
                event.type === 'generation.cancelled'
                  ? 'cancelled'
                  : event.type === 'generation.committed'
                    ? 'committed'
                    : event.type === 'generation.phase_changed'
                      ? event.payload.phase === 'cancel_requested'
                        ? 'stopping'
                        : event.payload.phase
                      : 'running';
              currentPhase = phase;
              listener?.({ phase, lastDurableSequence: event.sequence ?? 0 }, event);
            },
          });
          return { phase: currentPhase, error: null };
        },
        cancel: vi.fn(),
      };
    };
    return {
      cancelGeneration: mockCancelGeneration,
      createGeneration: createMockGeneration,
      regenerateGeneration: (_input: unknown, initial: ChatGenerationState) => {
        const controller = createMockGeneration(initial);
        let resolveDone!: (state: { phase: ChatGenerationState['stage']; error: null }) => void;
        let rejectDone!: (error: unknown) => void;
        const done = new Promise<{ phase: ChatGenerationState['stage']; error: null }>(
          (resolve, reject) => {
            resolveDone = resolve;
            rejectDone = reject;
          },
        );
        queueMicrotask(() => {
          void controller.start().then(resolveDone, rejectDone);
        });
        return { ...controller, done };
      },
      generation,
      generationRef: mockGenerationRef,
      setGeneration: (next: ChatGenerationState | null) => {
        mockGenerationRef.current = next;
        setGenerationState(next);
      },
    };
  },
}));
vi.mock('~/services/chat/use-chat-messages', () => ({
  toMessageOutput: (message: ChatMessageDto) => ({
    id: message.id,
    message: message.content,
    role: message.role,
  }),
}));
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const committedMessage = {
  id: 'assistant-1',
  chatId: 'chat-1',
  userId: 'user-1',
  role: 'assistant',
  content: 'Regenerated',
  files: null,
  toolCalls: null,
  reasoning: null,
  parentMessageId: 'assistant-1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} satisfies ChatMessageDto;

const { useRegenerateMessage } = await import('~/services/chat/use-regenerate-message');

function eventStream(events: GenerationEvent[]) {
  mockConsumeSseXhr.mockImplementationOnce(
    ({
      onEvent,
      replayUrl,
    }: {
      onEvent: (event: GenerationEvent) => void;
      replayUrl?: (afterSequence: number) => string;
    }) => {
      replayUrl?.(0);
      events.forEach(onEvent);
      return Promise.resolve();
    },
  );
}

describe('useRegenerateMessage', () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue('generation-1');
    mockGenerationRef.current = null;
    mockAbortControllerRef.current = null;
    mockConsumeSseXhr.mockReset();
    mockCancelGeneration.mockReset();
  });

  afterEach(() => vi.clearAllMocks());

  it('updates the target message after a committed regeneration', async () => {
    eventStream([
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 1,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'saving' },
      },
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 2,
        type: 'generation.committed',
        payload: { type: 'generation.committed', message: committedMessage },
      },
    ]);

    const { result, queryClient } = renderHookWithQueryClient(() => useRegenerateMessage('chat-1'));
    queryClient.setQueryData(chatKeys.messages('chat-1'), [
      { id: 'assistant-1', message: 'Old', role: 'assistant' },
    ]);

    await act(async () => {
      result.current.regenerateMessage('assistant-1');
      await waitFor(() => expect(mockConsumeSseXhr).toHaveBeenCalledOnce());
    });

    await waitFor(() => expect(result.current.generation).toBeNull());
    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toEqual([
      { id: 'assistant-1', message: 'Regenerated', role: 'assistant' },
    ]);
  });

  it('retains cancelled and failed generation state', async () => {
    eventStream([
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 1,
        type: 'generation.cancelled',
        payload: { type: 'generation.cancelled' },
      },
    ]);
    const { result } = renderHookWithQueryClient(() => useRegenerateMessage('chat-1'));

    await act(async () => {
      result.current.regenerateMessage('assistant-1');
      await waitFor(() => expect(result.current.generation?.stage).toBe('cancelled'));
    });

    mockConsumeSseXhr.mockRejectedValueOnce(new Error('regeneration failed'));
    await act(async () => {
      result.current.retryGeneration();
      await waitFor(() => expect(result.current.generation?.stage).toBe('failed'));
    });

    expect(result.current.generation?.error).toBe('regeneration failed');
  });

  it('delegates cancellation and retry to the active resource', async () => {
    mockConsumeSseXhr.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const { result } = renderHookWithQueryClient(() => useRegenerateMessage('chat-1'));

    await act(async () => {
      result.current.regenerateMessage('assistant-1');
      await waitFor(() => expect(result.current.generation?.stage).toBe('preparing'));
      await result.current.cancelGeneration();
    });

    expect(mockCancelGeneration).toHaveBeenCalledOnce();
  });

  it('reduces phase and cancellation events through the shared client reducer', async () => {
    eventStream([
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 1,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'preparing' },
      },
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 2,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'cancel_requested' },
      },
      {
        version: 1,
        generationId: 'generation-1',
        sequence: 3,
        type: 'generation.cancelled',
        payload: { type: 'generation.cancelled' },
      },
    ]);

    const { result } = renderHookWithQueryClient(() => useRegenerateMessage('chat-1'));

    await act(async () => {
      result.current.regenerateMessage('assistant-1');
      await waitFor(() => expect(result.current.generation?.stage).toBe('cancelled'));
    });
  });
});
