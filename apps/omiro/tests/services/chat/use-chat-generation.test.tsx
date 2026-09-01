// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockMmkvModule } from '../../mocks/mmkv';

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());
vi.mock('~/constants', () => ({ API_BASE_URL: 'http://localhost:4040' }));

const { storage } = await import('~/services/storage/mmkv');
const { useChatGeneration } = await import('~/services/chat/use-chat-generation');

const getAuthHeaders = vi.fn().mockResolvedValue({});
const { consumeGenerationSseXhr } = vi.hoisted(() => ({ consumeGenerationSseXhr: vi.fn() }));
const key = 'chat-generation:chat-1';

vi.mock('~/services/chat/consume-sse-xhr', () => ({ consumeGenerationSseXhr }));

describe('useChatGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.remove(key);
    consumeGenerationSseXhr.mockResolvedValue(undefined);
  });

  it('restores an active generation checkpoint from MMKV', () => {
    storage.set(
      key,
      JSON.stringify({
        generationId: 'generation-1',
        phase: 'awaiting_confirmation',
        lastDurableSequence: 12,
      }),
    );

    const { result } = renderHook(() => useChatGeneration({ chatId: 'chat-1', getAuthHeaders }));

    expect(result.current.generation).toEqual({
      id: 'generation-1',
      chatId: 'chat-1',
      stage: 'awaiting_confirmation',
      lastDurableSequence: 12,
    });
  });

  it('removes malformed checkpoints instead of restoring untrusted state', () => {
    storage.set(key, JSON.stringify({ generationId: 'generation-1', lastDurableSequence: -1 }));

    const { result } = renderHook(() => useChatGeneration({ chatId: 'chat-1', getAuthHeaders }));

    expect(result.current.generation).toBeNull();
    expect(storage.getString(key)).toBeUndefined();
  });

  it('persists cursor updates and clears terminal state', () => {
    const { result } = renderHook(() => useChatGeneration({ chatId: 'chat-1', getAuthHeaders }));

    act(() => {
      result.current.setGeneration({
        id: 'generation-1',
        chatId: 'chat-1',
        stage: 'running',
        lastDurableSequence: 7,
      });
    });
    expect(JSON.parse(storage.getString(key)!)).toEqual({
      generationId: 'generation-1',
      phase: 'running',
      lastDurableSequence: 7,
    });

    act(() => result.current.setGeneration(null));
    expect(storage.getString(key)).toBeUndefined();
  });

  it('reattaches an active checkpoint through durable GET replay', async () => {
    storage.set(
      key,
      JSON.stringify({
        generationId: 'generation-1',
        phase: 'running',
        lastDurableSequence: 12,
      }),
    );
    consumeGenerationSseXhr.mockImplementationOnce(
      async ({ onEvent }: { onEvent: (event: unknown) => void }) => {
        onEvent({
          version: 1,
          generationId: 'generation-1',
          sequence: 13,
          type: 'generation.phase_changed',
          payload: { type: 'generation.phase_changed', phase: 'saving' },
        });
      },
    );

    const { result } = renderHook(() => useChatGeneration({ chatId: 'chat-1', getAuthHeaders }));

    await waitFor(() => expect(consumeGenerationSseXhr).toHaveBeenCalledOnce());
    expect(consumeGenerationSseXhr).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        getReplayCursor: expect.any(Function),
      }),
    );
    expect(result.current.generation).toMatchObject({
      id: 'generation-1',
      stage: 'saving',
      lastDurableSequence: 13,
    });
  });
});
