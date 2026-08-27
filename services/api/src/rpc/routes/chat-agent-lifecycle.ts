import { AUDIO_TTS_MODEL, getSpeechUsageEstimate } from '@hominem/ai';
import type { ChatMessageFileRecord } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';
import { fileStorageService } from '@hominem/storage';
import { logger } from '@hominem/telemetry';

import { recordAIUsageEvent, startAIUsageTimer } from '../../application/ai-usage.service';
import { synthesizeChatReplySpeech } from './chat-speech.service';

export async function synthesizeAgentReplyAudio(
  userId: string,
  content: string,
): Promise<ChatMessageFileRecord | null> {
  const result = await synthesizeChatReplySpeech(content);
  if (result.kind === 'error') return null;

  const eventId = crypto.randomUUID();
  const getDurationMs = startAIUsageTimer();
  try {
    const stored = await fileStorageService.storeFile(result.buffer, result.mimeType, userId, {
      originalName: 'reply.mp3',
    });
    const usage = await getSpeechUsageEstimate({
      model: AUDIO_TTS_MODEL,
      characterCount: content.length,
    }).catch(() => null);
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage,
      status: 'succeeded',
      durationMs: getDurationMs(),
      metadata: { characterCount: content.length },
    });
    return {
      type: 'audio',
      fileId: stored.id,
      url: stored.url,
      filename: stored.originalName,
      mimeType: result.mimeType,
      size: result.buffer.byteLength,
    };
  } catch (error) {
    logger.warn('chat_agent_audio_projection_failed', {
      error: error instanceof Error ? error.message : 'Audio storage failed',
    });
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Audio storage failed',
      durationMs: getDurationMs(),
      metadata: {},
    });
    return null;
  }
}

export async function enqueueAgentChatEmbedding(userId: string, chatId: string) {
  await embeddingQueue.add(
    'generate-embedding',
    { jobId: `chat-${chatId}`, userId, entityType: 'chat' as const, entityId: chatId },
    { jobId: `chat-${chatId}`, removeOnComplete: true, removeOnFail: false },
  );
}
