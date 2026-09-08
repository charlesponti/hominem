import { randomUUID } from 'node:crypto';

import {
  AUDIO_TTS_MODEL,
  getSpeechUsageEstimate,
  synthesizeSpeech,
  synthesizeSpeechStream,
} from '@hominem/ai';
import { ChatSpeechRunRepository } from '@hominem/db/chats';
import { ChatRepository } from '@hominem/db/chats';
import type { ChatMessageFileRecord } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { fileStorageService } from '@hominem/storage';
import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../application/ai-usage.service';

export class ChatSpeechUnavailableError extends Error {
  constructor() {
    super('Speech playback is unavailable.');
    this.name = 'ChatSpeechUnavailableError';
  }
}

export class ChatSpeechMessageNotFoundError extends Error {
  constructor() {
    super('Assistant message');
    this.name = 'ChatSpeechMessageNotFoundError';
  }
}

export type ChatSpeechStream = {
  stream: ReadableStream<Uint8Array>;
  mimeType: string;
  providerReadyDurationMs: number;
};

const tracer = getTelemetryTracer('hominem.chat');
const MAX_CHARS = 2_000;

export type SynthesizedChatAudio = {
  file: ChatMessageFileRecord | null;
  eventId: string;
  generationId: string | null;
  usageAvailable: boolean;
  status: 'succeeded' | 'failed';
};

export async function streamMessageSpeech(input: {
  chatId: string;
  messageId: string;
  ownerUserId: string;
}): Promise<ChatSpeechStream> {
  await assertUnderMonthlyUsageLimit(input.ownerUserId);
  await ChatRepository.getOwnedOrThrow(db, input.chatId, input.ownerUserId);
  const message = await ChatRepository.getMessageById(db, input.chatId, input.messageId);
  if (!message || message.role !== 'assistant') {
    throw new ChatSpeechMessageNotFoundError();
  }

  const eventId = randomUUID();
  const speechRunId = randomUUID();
  const startedAt = performance.now();
  let firstAudioByteAt: number | null = null;
  let audioBytes = 0;
  const span = tracer.startSpan('chat.speech', {
    attributes: {
      'speech.feature': 'chat_speech',
      'speech.character_count': message.content.length,
    },
  });
  const duration = startAIUsageTimer();
  await ChatSpeechRunRepository.create(db, {
    id: speechRunId,
    messageId: input.messageId,
    ownerUserId: input.ownerUserId,
    usageEventId: eventId,
    provider: 'openrouter',
    characterCount: message.content.length,
  });
  const usagePromise = getSpeechUsageEstimate({
    model: AUDIO_TTS_MODEL,
    characterCount: message.content.length,
  }).catch((error: unknown) => {
    logger.warn('chat_speech_pricing_unavailable', {
      speechRunId,
      error: error instanceof Error ? error.message : 'Speech pricing unavailable',
    });
    return null;
  });
  const text = message.content.trim().slice(0, MAX_CHARS);
  if (!text) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    await recordAIUsageEvent({
      eventId,
      userId: input.ownerUserId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: 'No text to synthesize',
      durationMs: duration(),
      metadata: { messageId: input.messageId, characterCount: 0 },
    });
    await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
    await ChatSpeechRunRepository.markReconciliation(db, {
      id: speechRunId,
      status: 'failed',
      error: 'No text to synthesize',
    });
    throw new ChatSpeechUnavailableError();
  }

  let result;
  try {
    result = await synthesizeSpeechStream({ text });
  } catch (error) {
    span.recordException(new Error('Speech provider failed'));
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    await recordAIUsageEvent({
      eventId,
      userId: input.ownerUserId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Speech provider failed',
      durationMs: duration(),
      metadata: { messageId: input.messageId, characterCount: text.length },
    });
    await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
    await ChatSpeechRunRepository.markReconciliation(db, {
      id: speechRunId,
      status: 'failed',
      error: 'Speech provider failed',
    });
    throw new ChatSpeechUnavailableError();
  }
  const providerReadyDurationMs = Math.max(0, Math.round(performance.now() - startedAt));
  span.setAttribute('speech.provider_wait_ms', providerReadyDurationMs);
  logger.info('chat_speech_provider_ready', { speechRunId, providerReadyDurationMs });
  if (result.generationId) {
    await ChatSpeechRunRepository.setProviderGenerationId(db, {
      id: speechRunId,
      providerGenerationId: result.generationId,
    });
  }

  const reader = result.stream.getReader();
  let finished = false;
  const finish = async (status: 'succeeded' | 'failed', error?: unknown) => {
    if (finished) return;
    finished = true;
    const usage = status === 'succeeded' ? await usagePromise : null;
    await recordAIUsageEvent({
      eventId,
      userId: input.ownerUserId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage,
      status,
      ...(error ? { error } : {}),
      durationMs: duration(),
      metadata: {
        messageId: input.messageId,
        characterCount: message.content.length,
        ...(usage
          ? {
              costSource: usage.costSource ?? null,
              costPerCharacterUsd: usage.costPerCharacterUsd ?? null,
            }
          : {}),
      },
    });
    await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status });
    await ChatSpeechRunRepository.markReconciliation(db, {
      id: speechRunId,
      status: usage ? 'succeeded' : 'failed',
      ...(usage ? {} : { error: 'Speech pricing was unavailable' }),
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          span.setAttributes({
            'speech.time_to_first_audio_byte_ms':
              firstAudioByteAt === null
                ? -1
                : Math.max(0, Math.round(firstAudioByteAt - startedAt)),
            'speech.audio_bytes': audioBytes,
          });
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          await finish('succeeded');
          controller.close();
          return;
        }
        if (firstAudioByteAt === null) firstAudioByteAt = performance.now();
        audioBytes += next.value.byteLength;
        controller.enqueue(next.value);
      } catch (error) {
        logger.error('chat_speech_failed', { speechRunId, audioBytes, error });
        span.recordException(new Error('Speech stream failed'));
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        await finish('failed', error);
        controller.error(error);
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      await finish('failed', reason);
    },
  });

  return { stream, mimeType: result.mimeType, providerReadyDurationMs };
}

export async function synthesizeReplyAudioFile(
  userId: string,
  assistantText: string,
): Promise<SynthesizedChatAudio> {
  const eventId = randomUUID();
  const duration = startAIUsageTimer();
  const span = tracer.startSpan('chat.speech', {
    attributes: {
      'speech.feature': 'chat_speech',
      'speech.character_count': assistantText.length,
    },
  });
  const usagePromise = getSpeechUsageEstimate({
    model: AUDIO_TTS_MODEL,
    characterCount: assistantText.length,
  }).catch((error: unknown) => {
    logger.warn('chat_speech_pricing_unavailable', {
      error: error instanceof Error ? error.message : 'Speech pricing unavailable',
    });
    return null;
  });

  try {
    const text = assistantText.trim().slice(0, MAX_CHARS);
    if (!text) throw new Error('No text to synthesize');
    const result = await synthesizeSpeech({ text });
    const stored = await fileStorageService.storeFile(result.buffer, result.mimeType, userId, {
      originalName: 'reply.mp3',
    });
    const usage = await usagePromise;
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage,
      status: 'succeeded',
      durationMs: duration(),
      metadata: {
        costSource: usage?.costSource ?? null,
        costPerCharacterUsd: usage?.costPerCharacterUsd ?? null,
        characterCount: text.length,
      },
    });
    span.setAttribute('speech.audio_bytes', result.buffer.byteLength);
    span.end();
    return {
      file: {
        type: 'audio',
        fileId: stored.id,
        url: stored.url,
        filename: stored.originalName,
        mimeType: result.mimeType,
        size: result.buffer.byteLength,
      },
      eventId,
      generationId: result.generationId ?? null,
      usageAvailable: usage !== null,
      status: 'succeeded',
    };
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error('Speech synthesis failed'));
    span.end();
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Speech synthesis failed',
      durationMs: duration(),
      metadata: {},
    });
    return { file: null, eventId, generationId: null, usageAvailable: false, status: 'failed' };
  }
}

export async function persistSpeechRun(
  messageId: string,
  ownerUserId: string,
  text: string,
  audio: SynthesizedChatAudio,
): Promise<void> {
  const id = randomUUID();
  await ChatSpeechRunRepository.create(db, {
    id,
    messageId,
    ownerUserId,
    usageEventId: audio.eventId,
    provider: 'openrouter',
    characterCount: text.length,
  });
  if (audio.generationId) {
    await ChatSpeechRunRepository.setProviderGenerationId(db, {
      id,
      providerGenerationId: audio.generationId,
    });
  }
  await ChatSpeechRunRepository.markComplete(db, { id, status: audio.status });
  await ChatSpeechRunRepository.markReconciliation(db, {
    id,
    status: audio.usageAvailable ? 'succeeded' : 'failed',
    ...(audio.usageAvailable ? {} : { error: 'Speech pricing was unavailable' }),
  });
}
