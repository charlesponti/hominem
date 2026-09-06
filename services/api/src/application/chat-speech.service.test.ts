import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMessageById: vi.fn(),
  getOwnedOrThrow: vi.fn(),
  createRun: vi.fn(),
  setProviderGenerationId: vi.fn(),
  markComplete: vi.fn(),
  markReconciliation: vi.fn(),
  getSpeechUsageEstimate: vi.fn(),
  synthesizeSpeechStream: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  assertUnderMonthlyUsageLimit: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  AUDIO_TTS_MODEL: 'test-tts-model',
  getSpeechUsageEstimate: mocks.getSpeechUsageEstimate,
  synthesizeSpeechStream: mocks.synthesizeSpeechStream,
  synthesizeSpeech: vi.fn(),
}));

vi.mock('@hominem/db/chats', () => ({
  db: {},
  ChatRepository: {
    getMessageById: mocks.getMessageById,
    getOwnedOrThrow: mocks.getOwnedOrThrow,
  },
  ChatSpeechRunRepository: {
    create: mocks.createRun,
    setProviderGenerationId: mocks.setProviderGenerationId,
    markComplete: mocks.markComplete,
    markReconciliation: mocks.markReconciliation,
  },
}));
vi.mock('@hominem/db/core', () => ({ db: {} }));

vi.mock('@hominem/storage', () => ({ fileStorageService: {} }));
vi.mock('@hominem/telemetry', () => ({
  getTelemetryTracer: () => ({
    startSpan: () => ({
      end: vi.fn(),
      recordException: vi.fn(),
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
    }),
  }),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('./ai-usage.service', () => ({
  assertUnderMonthlyUsageLimit: mocks.assertUnderMonthlyUsageLimit,
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  startAIUsageTimer: () => () => 0,
}));

import {
  ChatSpeechMessageNotFoundError,
  ChatSpeechService,
  ChatSpeechUnavailableError,
} from './chat-speech.service';

const message = {
  id: 'message-1',
  chatId: 'chat-1',
  role: 'assistant' as const,
  content: 'Hello there',
};

describe('ChatSpeechService.streamMessageSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMessageById.mockResolvedValue(message);
    mocks.getSpeechUsageEstimate.mockResolvedValue({
      costSource: 'openrouter_model_catalog',
      costPerCharacterUsd: 0.001,
    });
    mocks.synthesizeSpeechStream.mockResolvedValue({
      mimeType: 'audio/mpeg',
      generationId: 'provider-generation-1',
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('audio'));
          controller.close();
        },
      }),
    });
  });

  it('persists and reconciles a successful stream', async () => {
    const result = await new ChatSpeechService().streamMessageSpeech({
      chatId: 'chat-1',
      messageId: 'message-1',
      ownerUserId: 'user-1',
    });

    expect(result.mimeType).toBe('audio/mpeg');
    expect(await new Response(result.stream).text()).toBe('audio');
    expect(mocks.createRun).toHaveBeenCalledOnce();
    expect(mocks.setProviderGenerationId).toHaveBeenCalledOnce();
    expect(mocks.markComplete).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: 'succeeded' }),
    );
    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: 'succeeded' }),
    );
  });

  it('terminalizes provider setup failures and returns a safe error', async () => {
    mocks.synthesizeSpeechStream.mockRejectedValue(new Error('provider secret'));

    await expect(
      new ChatSpeechService().streamMessageSpeech({
        chatId: 'chat-1',
        messageId: 'message-1',
        ownerUserId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ChatSpeechUnavailableError);
    expect(mocks.markComplete).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: 'failed' }),
    );
    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: 'failed', error: 'Speech provider failed' }),
    );
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('rejects missing assistant messages before creating a speech run', async () => {
    mocks.getMessageById.mockResolvedValue(null);

    await expect(
      new ChatSpeechService().streamMessageSpeech({
        chatId: 'chat-1',
        messageId: 'message-1',
        ownerUserId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(ChatSpeechMessageNotFoundError);
    expect(mocks.createRun).not.toHaveBeenCalled();
  });

  it('reconciles cancellation as a failed speech run', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('audio'));
      },
    });
    mocks.synthesizeSpeechStream.mockResolvedValue({
      stream,
      mimeType: 'audio/mpeg',
      generationId: null,
    });
    const result = await new ChatSpeechService().streamMessageSpeech({
      chatId: 'chat-1',
      messageId: 'message-1',
      ownerUserId: 'user-1',
    });
    const reader = result.stream.getReader();
    await reader.read();
    await reader.cancel('client disconnected');

    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
