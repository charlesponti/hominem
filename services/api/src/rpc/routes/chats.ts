import { randomUUID } from 'node:crypto';

import {
  AUDIO_TTS_MODEL,
  CHAT_MODEL,
  type ChatMessages,
  getChatCompletionUsage,
  getSpeechUsageEstimate,
} from '@hominem/ai';
import type { ChatMessageFileRecord, ChatMessageRecord, NoteContext } from '@hominem/db';
import { ChatRepository, ChatSpeechRunRepository, db, runInTransaction } from '@hominem/db';
import { chatFileCleanupQueue, embeddingQueue } from '@hominem/queues';
import { fileStorageService } from '@hominem/storage';
import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { SpanStatusCode } from '@opentelemetry/api';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import { planChatTools } from '../../mcp/llm-tools';
import { callTool } from '../../mcp/tools';
import {
  ChatsCreateSchema,
  ChatsEditMessageSchema,
  ChatsMessagesQuerySchema,
  ChatsRegenerateMessageSchema,
  ChatsSearchMessagesQuerySchema,
  ChatsSendSchema,
  ChatsStartStreamSchema,
  ChatsToolCallRespondSchema,
  ChatsUpdateSchema,
} from '../../schemas/chats.schema';
import { NotFoundError, UnavailableError, ValidationError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { CHAT_ASSISTANT_PROMPT, CHAT_RESPONSE_LENGTH_GUIDANCE } from '../prompts';
import { runCompletionWithTools } from './chat-completion-loop';
import { streamChatReplySpeech, synthesizeChatReplySpeech } from './chat-speech.service';
import { toChatDto, toChatMessageDto, toStoredUserMessageContent } from './chats.mapper';

type SynthesizedReplyAudio = {
  file: ChatMessageFileRecord | null;
  eventId: string;
  generationId: string | null;
  usageAvailable: boolean;
  status: 'succeeded' | 'failed';
};

const speechTracer = getTelemetryTracer('hominem.chat');

async function synthesizeReplyAudioFile(
  userId: string,
  assistantText: string,
): Promise<SynthesizedReplyAudio> {
  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  const speechSpan = speechTracer.startSpan('chat.speech', {
    attributes: {
      'speech.feature': 'chat_speech',
      'speech.character_count': assistantText.length,
    },
  });
  const speechUsagePromise = getSpeechUsageEstimate({
    model: AUDIO_TTS_MODEL,
    characterCount: assistantText.length,
  }).catch((error: unknown) => {
    logger.warn('chat_speech_pricing_unavailable', {
      error: error instanceof Error ? error.message : 'Speech pricing unavailable',
    });
    return null;
  });
  const result = await synthesizeChatReplySpeech(assistantText);
  const generationId = 'generationId' in result ? result.generationId : null;

  if (result.kind === 'error') {
    speechSpan.setStatus({ code: SpanStatusCode.ERROR });
    speechSpan.end();
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: result.message,
      durationMs: getDurationMs(),
      metadata: {},
    });
    return { file: null, eventId, generationId: null, usageAvailable: false, status: 'failed' };
  }

  try {
    const stored = await fileStorageService.storeFile(result.buffer, result.mimeType, userId, {
      originalName: 'reply.mp3',
    });

    const speechUsage = await speechUsagePromise;
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: speechUsage,
      status: 'succeeded',
      durationMs: getDurationMs(),
      metadata: {
        costSource: speechUsage?.costSource ?? null,
        costPerCharacterUsd: speechUsage?.costPerCharacterUsd ?? null,
        characterCount: assistantText.length,
      },
    });
    speechSpan.setAttribute('speech.audio_bytes', result.buffer.byteLength);
    speechSpan.setStatus({ code: SpanStatusCode.OK });
    speechSpan.end();

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
      generationId,
      usageAvailable: speechUsage !== null,
      status: 'succeeded',
    };
  } catch (error) {
    speechSpan.recordException(new Error('Speech file storage failed'));
    speechSpan.setStatus({ code: SpanStatusCode.ERROR });
    speechSpan.end();
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      model: AUDIO_TTS_MODEL,
      usage: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'File storage failed',
      durationMs: getDurationMs(),
      metadata: {},
    });
    return { file: null, eventId, generationId, usageAvailable: false, status: 'failed' };
  }
}

// Rough chars/words-per-token headroom for each target: short caps at ~500-600
// characters, medium at a 3-5 minute read (~600-1000 words), long at a full
// essay (~1500-3000 words) with room for the model's outline-then-write pass.
const RESPONSE_LENGTH_MAX_TOKENS = {
  short: 250,
  medium: 1600,
  long: 6000,
} as const satisfies Record<'short' | 'medium' | 'long', number>;

// `chat_messages.content` has a not-blank check constraint; a turn that ends
// in a pending tool-call confirmation can have no text of its own, so this
// gives it a placeholder rather than failing the insert.
function resolveAssistantContent(
  assistantText: string,
  pendingToolCall: { toolName: string } | null,
): string {
  if (assistantText.trim()) return assistantText;
  if (pendingToolCall) {
    return `I'd like to run "${pendingToolCall.toolName}", which needs your approval first.`;
  }
  return assistantText;
}

function getSystemPrompt(responseLength?: 'short' | 'medium' | 'long'): string {
  if (!responseLength) {
    return CHAT_ASSISTANT_PROMPT;
  }

  return `${CHAT_ASSISTANT_PROMPT}\n\n${CHAT_RESPONSE_LENGTH_GUIDANCE[responseLength]}`;
}

// The "long" essay option plans an outline before writing, so give it room to
// reason through structure before committing to prose.
function getReasoningConfig(responseLength?: 'short' | 'medium' | 'long') {
  return responseLength === 'long' ? { effort: 'medium' as const } : undefined;
}

async function enqueueChatEmbedding(userId: string, chatId: string) {
  await embeddingQueue.add(
    'generate-embedding',
    { jobId: `chat-${chatId}`, userId, entityType: 'chat' as const, entityId: chatId },
    { jobId: `chat-${chatId}`, removeOnComplete: true, removeOnFail: false },
  );
}

function formatUserContentWithContext(
  message: string,
  notes: NoteContext[],
  files: ChatMessageFileRecord[],
): string {
  const sections = [];

  sections.push(message.trim());

  if (notes.length > 0) {
    sections.push(
      [
        'Referenced notes:',
        ...notes.map((note, index) => {
          const fileText = note.files
            .flatMap((file) => {
              const snippet = file.textContent ?? file.content;
              return snippet ? [`- ${file.originalName}: ${snippet.slice(0, 1_000)}`] : [];
            })
            .join('\n');

          return [
            `${index + 1}. ${note.title ?? 'Untitled note'} (${note.id})`,
            note.content,
            ...(fileText ? ['Attached files:', fileText] : []),
          ].join('\n');
        }),
      ].join('\n\n'),
    );
  }

  if (files.length > 0) {
    sections.push(
      [
        'Attached files:',
        ...files.map((file, index) => {
          const extractedText =
            file.metadata && typeof file.metadata === 'object' && 'extractedText' in file.metadata
              ? String(file.metadata.extractedText)
              : '';
          return [
            `${index + 1}. ${file.filename ?? 'Attachment'} (${file.mimeType ?? 'application/octet-stream'})`,
            ...(extractedText ? [extractedText] : []),
          ].join('\n');
        }),
      ].join('\n\n'),
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

function buildMessages(
  history: ChatMessageRecord[],
  currentUserContent: string,
  systemPrompt: string,
): ChatMessages[] {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map(
      (entry): ChatMessages => ({
        role: entry.role === 'assistant' ? 'assistant' : 'user',
        content: entry.content,
      }),
    ),
    { role: 'user', content: currentUserContent },
  ];
}

function getChatId(c: { req: { param: (name: string) => string | undefined } }): string {
  const chatId = c.req.param('id');
  if (!chatId) throw new ValidationError('Chat id is required');
  return chatId;
}

function getMessageId(c: { req: { param: (name: string) => string | undefined } }): string {
  const messageId = c.req.param('messageId');
  if (!messageId) throw new ValidationError('Message id is required');
  return messageId;
}

function writeGenerationEvent(
  stream: { writeSSE: (input: { data: string }) => Promise<void> },
  event: Record<string, unknown>,
) {
  return stream.writeSSE({ data: JSON.stringify(event) });
}

function writeErrorEvent(
  stream: { writeSSE: (input: { data: string }) => Promise<void> },
  message: string,
) {
  return stream.writeSSE({ data: JSON.stringify({ type: 'error', message }) });
}

const chatByIdRoutes = new Hono<AppContext>()
  .use('/stream', rateLimitMiddleware({ bucket: 'chat-stream', windowSec: 60, max: 30 }))
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    const chat = await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const messages = await ChatRepository.getMessages(db, chatId, 100, 0);

    return c.json({
      ...toChatDto(chat),
      messages: messages.map(toChatMessageDto),
    });
  })
  .patch('/', zValidator('json', ChatsUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { title } = c.req.valid('json');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    await ChatRepository.updateTitle(db, chatId, userId, title);

    return c.json({ success: true });
  })
  .post('/archive', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const archived = await ChatRepository.archive(db, chatId, userId);

    return c.json(toChatDto(archived));
  })
  .get('/messages', zValidator('query', ChatsMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const query = c.req.valid('query');
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 100;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

    const messages = await ChatRepository.getMessages(db, chatId, limit, offset);
    return c.json(messages.map(toChatMessageDto));
  })
  .use(
    '/messages/:messageId/speech',
    rateLimitMiddleware({ bucket: 'chat-speech', windowSec: 60, max: 20 }),
  )
  .get('/messages/:messageId/speech', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    await assertUnderMonthlyUsageLimit(userId);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const message = await ChatRepository.getMessageById(db, chatId, messageId);
    if (!message || message.role !== 'assistant') {
      throw new NotFoundError('Assistant message');
    }

    const eventId = randomUUID();
    const speechRunId = randomUUID();
    const speechStartedAt = performance.now();
    let firstAudioByteAt: number | null = null;
    let audioBytes = 0;
    logger.info('chat_speech_requested', { speechRunId });
    const speechSpan = speechTracer.startSpan('chat.speech', {
      attributes: {
        'speech.feature': 'chat_speech',
        'speech.character_count': message.content.length,
      },
    });
    const getDurationMs = startAIUsageTimer();
    await ChatSpeechRunRepository.create(db, {
      id: speechRunId,
      messageId,
      ownerUserId: userId,
      usageEventId: eventId,
      provider: 'openrouter',
      characterCount: message.content.length,
    });
    const speechUsagePromise = getSpeechUsageEstimate({
      model: AUDIO_TTS_MODEL,
      characterCount: message.content.length,
    }).catch((error: unknown) => {
      logger.warn('chat_speech_pricing_unavailable', {
        speechRunId,
        error: error instanceof Error ? error.message : 'Speech pricing unavailable',
      });
      return null;
    });
    const result = await streamChatReplySpeech(message.content);
    const providerReadyDurationMs = Math.max(0, Math.round(performance.now() - speechStartedAt));
    speechSpan.setAttribute('speech.provider_wait_ms', providerReadyDurationMs);
    logger.info('chat_speech_provider_ready', { speechRunId, durationMs: providerReadyDurationMs });
    if (result.kind === 'error') {
      speechSpan.setStatus({ code: SpanStatusCode.ERROR });
      speechSpan.end();
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'chat_speech',
        operation: 'speech',
        model: AUDIO_TTS_MODEL,
        usage: null,
        status: 'failed',
        error: result.message,
        durationMs: getDurationMs(),
        metadata: { messageId, characterCount: message.content.length },
      });
      await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
      await ChatSpeechRunRepository.markReconciliation(db, {
        id: speechRunId,
        status: 'failed',
        error: result.message,
      });
      throw new UnavailableError('Speech playback is unavailable.');
    }

    if (result.generationId) {
      await ChatSpeechRunRepository.setProviderGenerationId(db, {
        id: speechRunId,
        providerGenerationId: result.generationId,
      });
    }

    const reader = result.stream.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await reader.read();
          if (next.done) {
            logger.info('chat_speech_completed', {
              speechRunId,
              providerReadyDurationMs,
              timeToFirstAudioByteMs:
                firstAudioByteAt === null
                  ? null
                  : Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
              durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
              audioBytes,
            });
            speechSpan.setAttributes({
              'speech.time_to_first_audio_byte_ms':
                firstAudioByteAt === null
                  ? -1
                  : Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
              'speech.stream_duration_ms': Math.max(
                0,
                Math.round(performance.now() - speechStartedAt),
              ),
              'speech.audio_bytes': audioBytes,
            });
            speechSpan.setStatus({ code: SpanStatusCode.OK });
            speechSpan.end();
            const speechUsage = await speechUsagePromise;
            await recordAIUsageEvent({
              eventId,
              userId,
              feature: 'chat_speech',
              operation: 'speech',
              model: AUDIO_TTS_MODEL,
              usage: speechUsage,
              status: 'succeeded',
              durationMs: getDurationMs(),
              metadata: {
                messageId,
                characterCount: message.content.length,
                costSource: speechUsage?.costSource ?? null,
                costPerCharacterUsd: speechUsage?.costPerCharacterUsd ?? null,
              },
            });
            await ChatSpeechRunRepository.markComplete(db, {
              id: speechRunId,
              status: 'succeeded',
            });
            await ChatSpeechRunRepository.markReconciliation(db, {
              id: speechRunId,
              status: speechUsage ? 'succeeded' : 'failed',
              ...(speechUsage ? {} : { error: 'Speech pricing was unavailable' }),
            });
            controller.close();
            return;
          }
          if (firstAudioByteAt === null) {
            firstAudioByteAt = performance.now();
            logger.info('chat_speech_first_audio_byte', {
              speechRunId,
              durationMs: Math.max(0, Math.round(firstAudioByteAt - speechStartedAt)),
            });
          }
          audioBytes += next.value.byteLength;
          controller.enqueue(next.value);
        } catch (error) {
          logger.error('chat_speech_failed', {
            speechRunId,
            durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
            audioBytes,
            error,
          });
          speechSpan.recordException(new Error('Speech stream failed'));
          speechSpan.setStatus({ code: SpanStatusCode.ERROR });
          speechSpan.end();
          await recordAIUsageEvent({
            eventId,
            userId,
            feature: 'chat_speech',
            operation: 'speech',
            model: AUDIO_TTS_MODEL,
            usage: null,
            status: 'failed',
            error,
            durationMs: getDurationMs(),
            metadata: { messageId, characterCount: message.content.length },
          });
          await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
          await ChatSpeechRunRepository.markReconciliation(db, {
            id: speechRunId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Speech stream failed',
          });
          controller.error(error);
        }
      },
      async cancel(reason) {
        logger.warn('chat_speech_cancelled', {
          speechRunId,
          durationMs: Math.max(0, Math.round(performance.now() - speechStartedAt)),
          audioBytes,
        });
        speechSpan.setAttributes({
          'speech.stream_duration_ms': Math.max(0, Math.round(performance.now() - speechStartedAt)),
          'speech.audio_bytes': audioBytes,
          'speech.outcome': 'cancelled',
        });
        speechSpan.setStatus({ code: SpanStatusCode.OK });
        speechSpan.end();
        await reader.cancel(reason);
        await recordAIUsageEvent({
          eventId,
          userId,
          feature: 'chat_speech',
          operation: 'speech',
          model: AUDIO_TTS_MODEL,
          usage: null,
          status: 'failed',
          error: reason,
          durationMs: getDurationMs(),
          metadata: { messageId, characterCount: message.content.length },
        });
        await ChatSpeechRunRepository.markComplete(db, { id: speechRunId, status: 'failed' });
        await ChatSpeechRunRepository.markReconciliation(db, {
          id: speechRunId,
          status: 'failed',
          error: reason instanceof Error ? reason.message : 'Speech stream cancelled',
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': result.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Server-Timing': `speech-provider;dur=${providerReadyDurationMs}`,
      },
    });
  })
  .get('/messages/search', zValidator('query', ChatsSearchMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const { query, limit } = c.req.valid('query');
    const messages = await ChatRepository.searchMessages(db, chatId, query, limit);

    return c.json(messages.map(toChatMessageDto));
  })
  .get('/generations/:generationId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const generationId = c.req.param('generationId');
    if (!generationId) throw new ValidationError('Generation id is required');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const run = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
    if (!run) throw new ValidationError('Generation run not found');
    return c.json(run);
  })
  .post('/generations/:generationId/cancel', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const generationId = c.req.param('generationId');
    if (!generationId) throw new ValidationError('Generation id is required');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const run = await ChatRepository.cancelGenerationRun(db, generationId, userId);
    if (!run) throw new ValidationError('Generation cannot be cancelled');
    return c.json(run);
  })
  .patch('/messages/:messageId', zValidator('json', ChatsEditMessageSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);
    const { content } = c.req.valid('json');

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const updated = await ChatRepository.updateMessageContent(
      db,
      chatId,
      messageId,
      userId,
      content,
    );

    return c.json(toChatMessageDto(updated));
  })
  .delete('/messages/:messageId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const result = await runInTransaction((trx) =>
      ChatRepository.deleteUserMessageAndFollowing(trx, chatId, messageId, userId),
    );

    if (result.cleanupFileIds.length > 0) {
      await chatFileCleanupQueue.add(
        'cleanup-chat-files',
        { fileIds: result.cleanupFileIds, userId },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          jobId: `chat-file-cleanup:${chatId}:${messageId}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return c.json({ deletedMessageIds: result.deletedMessageIds });
  })
  .post(
    '/messages/:messageId/regenerate',
    zValidator('json', ChatsRegenerateMessageSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const messageId = getMessageId(c);
      const { generationId, responseLength } = c.req.valid('json');

      await assertUnderMonthlyUsageLimit(userId);
      await ChatRepository.getOwnedOrThrow(db, chatId, userId);

      const target = await ChatRepository.getMessageById(db, chatId, messageId);
      if (!target || target.role !== 'assistant') {
        throw new ValidationError('Only a completed assistant message can be regenerated');
      }

      const priorMessages = await ChatRepository.getMessagesBefore(db, chatId, target.createdAt);
      const parentIndex = [...priorMessages].reverse().findIndex((m) => m.role === 'user');
      if (parentIndex === -1) {
        throw new ValidationError('No prior message to regenerate a reply from');
      }
      const resolvedParentIndex = priorMessages.length - 1 - parentIndex;
      const parentUserMessage = priorMessages[resolvedParentIndex]!;
      const history = priorMessages.slice(0, resolvedParentIndex);

      const resolvedNotes = await ChatRepository.resolveReferencedNotes(
        db,
        userId,
        parentUserMessage.referencedNotes?.map((note) => note.id) ?? [],
        parentUserMessage.content,
      );
      const resolvedFiles = parentUserMessage.files ?? [];
      const existingRun = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
      if (existingRun) {
        return streamSSE(c, async (stream) => {
          if (existingRun.status === 'committed' && existingRun.assistantMessageId) {
            const committed = await ChatRepository.getMessageById(
              db,
              chatId,
              existingRun.assistantMessageId,
            );
            if (committed) {
              await writeGenerationEvent(stream, {
                type: 'committed',
                generationId,
                message: toChatMessageDto(committed),
              });
            }
          } else if (existingRun.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          } else {
            await writeGenerationEvent(stream, {
              type: 'status',
              generationId,
              status: existingRun.status === 'saving' ? 'saving' : 'preparing',
            });
          }
          await stream.writeSSE({ data: '[DONE]' });
        });
      }
      await ChatRepository.createGenerationRun(db, {
        id: generationId,
        chatId,
        ownerUserId: userId,
        kind: 'regenerate',
        targetAssistantMessageId: messageId,
      });

      const currentUserContent = formatUserContentWithContext(
        parentUserMessage.content,
        resolvedNotes,
        resolvedFiles,
      );
      const chatMessages = buildMessages(
        history,
        currentUserContent,
        getSystemPrompt(responseLength),
      );
      const chatToolPlan = await planChatTools({ model: CHAT_MODEL, messages: chatMessages });
      const eventId = randomUUID();
      const getDurationMs = startAIUsageTimer();

      return streamSSE(c, async (stream) => {
        let assistantText = '';
        let reasoningText: string | null = null;
        let toolCallRecords: Awaited<ReturnType<typeof runCompletionWithTools>>['toolCallRecords'] =
          [];
        let pendingToolCall: Awaited<ReturnType<typeof runCompletionWithTools>>['pendingToolCall'] =
          null;
        let usage: ReturnType<typeof getChatCompletionUsage> = null;
        let streamError: unknown = null;

        await writeGenerationEvent(stream, {
          type: 'accepted',
          generationId,
          chatId,
          chat: toChatDto(await ChatRepository.getOwnedOrThrow(db, chatId, userId)),
          userMessage: null,
        });
        await writeGenerationEvent(stream, { type: 'status', generationId, status: 'preparing' });

        try {
          const result = await runCompletionWithTools({
            userId,
            model: CHAT_MODEL,
            messages: chatMessages,
            tools: chatToolPlan.tools,
            requiresToolCall: chatToolPlan.requiresLookup,
            maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
            reasoning: getReasoningConfig(responseLength),
            onEvent: (event) => writeGenerationEvent(stream, { ...event, generationId }),
          });
          assistantText = result.assistantText;
          reasoningText = result.reasoningText;
          toolCallRecords = result.toolCallRecords;
          pendingToolCall = result.pendingToolCall;
          usage = result.usage;
        } catch (error) {
          streamError = error;
        } finally {
          await recordAIUsageEvent({
            eventId,
            userId,
            feature: 'chat_stream',
            operation: 'chat_completion',
            usage,
            status: streamError ? 'failed' : 'succeeded',
            error: streamError,
            durationMs: getDurationMs(),
            metadata: {
              chatId,
              messageId,
              regenerate: true,
              toolCallCount: toolCallRecords.length,
            },
          });
        }

        if (streamError) {
          const message = streamError instanceof Error ? streamError.message : 'Stream error';
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'failed',
            errorMessage: message,
          });
          await writeErrorEvent(stream, message);
          return;
        }

        try {
          if (!assistantText.trim() && !pendingToolCall) {
            throw new Error('No reply was generated');
          }
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'saving',
          });
          await writeGenerationEvent(stream, { type: 'status', generationId, status: 'saving' });
          const beforeCommit = await ChatRepository.getGenerationRun(
            db,
            chatId,
            generationId,
            userId,
          );
          if (beforeCommit?.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
            return;
          }
          const committed = await runInTransaction(async (trx) => {
            const updated = await ChatRepository.replaceAssistantMessageContent(
              trx,
              chatId,
              messageId,
              resolveAssistantContent(assistantText, pendingToolCall),
              {
                reasoning: reasoningText,
                toolCalls: toolCallRecords.length > 0 ? toolCallRecords : null,
              },
            );
            await ChatRepository.touchLastMessage(trx, chatId);
            await ChatRepository.updateGenerationRun(trx, {
              id: generationId,
              ownerUserId: userId,
              status: 'committed',
              assistantMessageId: updated.id,
            });
            return updated;
          });
          await enqueueChatEmbedding(userId, chatId);

          await writeGenerationEvent(stream, {
            type: 'committed',
            generationId,
            message: toChatMessageDto(committed),
          });
          if (pendingToolCall) {
            await writeGenerationEvent(stream, {
              type: 'tool-confirmation-required',
              generationId,
              messageId: committed.id,
              toolCallId: pendingToolCall.toolCallId,
              toolName: pendingToolCall.toolName,
              args: pendingToolCall.args,
              preview: pendingToolCall.preview,
            });
          }
          await stream.writeSSE({ data: '[DONE]' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream error';
          const run = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
          if (run?.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
            return;
          }
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'failed',
            errorMessage: message,
          });
          await writeErrorEvent(stream, message);
        }
      });
    },
  )
  .post(
    '/messages/:messageId/tool-calls/:toolCallId/respond',
    zValidator('json', ChatsToolCallRespondSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const chatId = getChatId(c);
      const messageId = getMessageId(c);
      const toolCallId = c.req.param('toolCallId');
      if (!toolCallId) throw new ValidationError('Tool call id is required');
      const { approved, generationId, responseLength } = c.req.valid('json');

      await ChatRepository.getOwnedOrThrow(db, chatId, userId);
      const targetMessage = await ChatRepository.getMessageById(db, chatId, messageId);
      if (!targetMessage || targetMessage.role !== 'assistant') {
        throw new ValidationError('Tool call not found on an assistant message');
      }
      const pendingCall = targetMessage.toolCalls?.find((call) => call.toolCallId === toolCallId);
      if (!pendingCall) {
        throw new ValidationError('Tool call not found');
      }
      if (pendingCall.status !== 'pending') {
        throw new ValidationError('Tool call is not awaiting confirmation');
      }

      if (!approved) {
        const updated = await ChatRepository.updateToolCallStatus(
          db,
          chatId,
          messageId,
          toolCallId,
          'rejected',
        );
        return c.json(toChatMessageDto(updated));
      }

      await assertUnderMonthlyUsageLimit(userId);

      const existingRun = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
      if (existingRun) {
        return streamSSE(c, async (stream) => {
          if (existingRun.status === 'committed' && existingRun.assistantMessageId) {
            const committed = await ChatRepository.getMessageById(
              db,
              chatId,
              existingRun.assistantMessageId,
            );
            if (committed) {
              await writeGenerationEvent(stream, {
                type: 'committed',
                generationId,
                message: toChatMessageDto(committed),
              });
            }
          } else if (existingRun.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          } else {
            await writeGenerationEvent(stream, {
              type: 'status',
              generationId,
              status: existingRun.status === 'saving' ? 'saving' : 'preparing',
            });
          }
          await stream.writeSSE({ data: '[DONE]' });
        });
      }

      let toolResultContent: string;
      let toolError: string | null = null;
      try {
        const toolResult = await callTool(userId, pendingCall.toolName, pendingCall.args);
        toolResultContent = toolResult.content[0]?.text ?? 'null';
      } catch (error) {
        toolError = error instanceof Error ? error.message : 'Tool call failed';
        toolResultContent = JSON.stringify({ error: toolError });
      }
      await ChatRepository.updateToolCallStatus(
        db,
        chatId,
        messageId,
        toolCallId,
        toolError ? 'rejected' : 'completed',
      );
      await ChatRepository.createGenerationRun(db, {
        id: generationId,
        chatId,
        ownerUserId: userId,
        kind: 'send',
      });

      const history = await ChatRepository.getMessages(db, chatId, 30, 0);
      const pendingMessageIndex = history.findIndex((entry) => entry.id === messageId);
      const priorHistory =
        pendingMessageIndex === -1 ? history : history.slice(0, pendingMessageIndex);
      const chatMessages: ChatMessages[] = [
        { role: 'system', content: getSystemPrompt(responseLength) },
        ...priorHistory.map(
          (entry): ChatMessages => ({
            role: entry.role === 'assistant' ? 'assistant' : 'user',
            content: entry.content,
          }),
        ),
        {
          role: 'assistant',
          content: targetMessage.content || null,
          toolCalls: [
            {
              id: toolCallId,
              type: 'function',
              function: { name: pendingCall.toolName, arguments: JSON.stringify(pendingCall.args) },
            },
          ],
        },
        { role: 'tool', toolCallId, content: toolResultContent },
      ];
      const chatToolPlan = await planChatTools({ model: CHAT_MODEL, messages: chatMessages });
      const eventId = randomUUID();
      const getDurationMs = startAIUsageTimer();

      return streamSSE(c, async (stream) => {
        let assistantText = '';
        let reasoningText: string | null = null;
        let toolCallRecords: Awaited<ReturnType<typeof runCompletionWithTools>>['toolCallRecords'] =
          [];
        let pendingToolCall: Awaited<ReturnType<typeof runCompletionWithTools>>['pendingToolCall'] =
          null;
        let usage: ReturnType<typeof getChatCompletionUsage> = null;
        let streamError: unknown = null;

        await writeGenerationEvent(stream, {
          type: 'accepted',
          generationId,
          chatId,
          chat: toChatDto(await ChatRepository.getOwnedOrThrow(db, chatId, userId)),
          userMessage: null,
        });
        await writeGenerationEvent(stream, { type: 'status', generationId, status: 'preparing' });

        try {
          const result = await runCompletionWithTools({
            userId,
            model: CHAT_MODEL,
            messages: chatMessages,
            tools: chatToolPlan.tools,
            requiresToolCall: chatToolPlan.requiresLookup,
            maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
            reasoning: getReasoningConfig(responseLength),
            onEvent: (event) => writeGenerationEvent(stream, { ...event, generationId }),
          });
          assistantText = result.assistantText;
          reasoningText = result.reasoningText;
          toolCallRecords = result.toolCallRecords;
          pendingToolCall = result.pendingToolCall;
          usage = result.usage;
        } catch (error) {
          streamError = error;
        } finally {
          await recordAIUsageEvent({
            eventId,
            userId,
            feature: 'chat_stream',
            operation: 'chat_completion',
            usage,
            status: streamError ? 'failed' : 'succeeded',
            error: streamError,
            durationMs: getDurationMs(),
            metadata: {
              chatId,
              messageId,
              toolCallRespond: true,
              toolCallCount: toolCallRecords.length,
            },
          });
        }

        if (streamError) {
          const message = streamError instanceof Error ? streamError.message : 'Stream error';
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'failed',
            errorMessage: message,
          });
          await writeErrorEvent(stream, message);
          return;
        }

        try {
          if (!assistantText.trim() && !pendingToolCall) {
            throw new Error('No reply was generated');
          }
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'saving',
          });
          await writeGenerationEvent(stream, { type: 'status', generationId, status: 'saving' });
          const beforeCommit = await ChatRepository.getGenerationRun(
            db,
            chatId,
            generationId,
            userId,
          );
          if (beforeCommit?.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
            return;
          }

          const committed = await runInTransaction(async (trx) => {
            const assistantMessage = await ChatRepository.insertMessage(trx, {
              chatId,
              authorUserId: userId,
              role: 'assistant',
              content: resolveAssistantContent(assistantText, pendingToolCall),
              reasoning: reasoningText,
              toolCalls: toolCallRecords.length > 0 ? toolCallRecords : null,
            });
            await ChatRepository.touchLastMessage(trx, chatId);
            await ChatRepository.updateGenerationRun(trx, {
              id: generationId,
              ownerUserId: userId,
              status: 'committed',
              assistantMessageId: assistantMessage.id,
            });
            return ChatRepository.getMessageById(trx, chatId, assistantMessage.id);
          });
          await enqueueChatEmbedding(userId, chatId);

          if (!committed) throw new Error('Saved reply could not be loaded');
          await writeGenerationEvent(stream, {
            type: 'committed',
            generationId,
            message: toChatMessageDto(committed),
          });
          if (pendingToolCall) {
            await writeGenerationEvent(stream, {
              type: 'tool-confirmation-required',
              generationId,
              messageId: committed.id,
              toolCallId: pendingToolCall.toolCallId,
              toolName: pendingToolCall.toolName,
              args: pendingToolCall.args,
              preview: pendingToolCall.preview,
            });
          }
          await stream.writeSSE({ data: '[DONE]' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Stream error';
          const run = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
          if (run?.status === 'cancelled') {
            await writeGenerationEvent(stream, { type: 'cancelled', generationId });
            return;
          }
          await ChatRepository.updateGenerationRun(db, {
            id: generationId,
            ownerUserId: userId,
            status: 'failed',
            errorMessage: message,
          });
          await writeErrorEvent(stream, message);
        }
      });
    },
  )
  .post('/stream', zValidator('json', ChatsSendSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await assertUnderMonthlyUsageLimit(userId);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const {
      generationId,
      message,
      fileIds = [],
      noteIds = [],
      responseModality,
      responseLength,
    } = c.req.valid('json');

    const history = await ChatRepository.getMessages(db, chatId, 30, 0);
    const resolvedNotes = await ChatRepository.resolveReferencedNotes(db, userId, noteIds, message);
    const resolvedFiles = await ChatRepository.resolveChatFiles(db, userId, fileIds);

    const storedUserContent = toStoredUserMessageContent(message, resolvedNotes, resolvedFiles);
    if (!storedUserContent) {
      throw new ValidationError('Message, notes, or files are required');
    }

    const existingRun = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
    if (existingRun) {
      return streamSSE(c, async (stream) => {
        if (existingRun.status === 'committed' && existingRun.assistantMessageId) {
          const committed = await ChatRepository.getMessageById(
            db,
            chatId,
            existingRun.assistantMessageId,
          );
          if (committed) {
            await writeGenerationEvent(stream, {
              type: 'committed',
              generationId,
              message: toChatMessageDto(committed),
            });
          }
        } else if (existingRun.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
        } else {
          await writeGenerationEvent(stream, {
            type: 'status',
            generationId,
            status: existingRun.status === 'saving' ? 'saving' : 'preparing',
          });
        }
        await stream.writeSSE({ data: '[DONE]' });
      });
    }

    const userMessageId = await runInTransaction(async (trx) => {
      const userMessage = await ChatRepository.insertMessage(trx, {
        chatId,
        authorUserId: userId,
        role: 'user',
        content: storedUserContent,
        files: resolvedFiles.length > 0 ? resolvedFiles : null,
        referencedNoteIds: resolvedNotes.length > 0 ? resolvedNotes.map((n) => n.id) : null,
      });
      await ChatRepository.touchLastMessage(trx, chatId);
      await ChatRepository.createGenerationRun(trx, {
        id: generationId,
        chatId,
        ownerUserId: userId,
        kind: 'send',
        userMessageId: userMessage.id,
      });
      return userMessage.id;
    });
    const userMessage = await ChatRepository.getMessageById(db, chatId, userMessageId);
    const currentUserContent = formatUserContentWithContext(message, resolvedNotes, resolvedFiles);
    const chatMessages = buildMessages(
      history,
      currentUserContent,
      getSystemPrompt(responseLength),
    );
    const chatToolPlan = await planChatTools({ model: CHAT_MODEL, messages: chatMessages });
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    return streamSSE(c, async (stream) => {
      let assistantText = '';
      let reasoningText: string | null = null;
      let toolCallRecords: Awaited<ReturnType<typeof runCompletionWithTools>>['toolCallRecords'] =
        [];
      let pendingToolCall: Awaited<ReturnType<typeof runCompletionWithTools>>['pendingToolCall'] =
        null;
      let usage: ReturnType<typeof getChatCompletionUsage> = null;
      let streamError: unknown = null;

      await writeGenerationEvent(stream, {
        type: 'accepted',
        generationId,
        chatId,
        chat: toChatDto(await ChatRepository.getOwnedOrThrow(db, chatId, userId)),
        userMessage: userMessage ? toChatMessageDto(userMessage) : null,
      });
      await writeGenerationEvent(stream, { type: 'status', generationId, status: 'preparing' });

      try {
        const result = await runCompletionWithTools({
          userId,
          model: CHAT_MODEL,
          messages: chatMessages,
          tools: chatToolPlan.tools,
          requiresToolCall: chatToolPlan.requiresLookup,
          maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
          reasoning: getReasoningConfig(responseLength),
          onEvent: (event) => writeGenerationEvent(stream, { ...event, generationId }),
        });
        assistantText = result.assistantText;
        reasoningText = result.reasoningText;
        toolCallRecords = result.toolCallRecords;
        pendingToolCall = result.pendingToolCall;
        usage = result.usage;
      } catch (error) {
        streamError = error;
      } finally {
        await recordAIUsageEvent({
          eventId,
          userId,
          feature: 'chat_stream',
          operation: 'chat_completion',
          usage,
          status: streamError ? 'failed' : 'succeeded',
          error: streamError,
          durationMs: getDurationMs(),
          metadata: {
            chatId,
            noteCount: resolvedNotes.length,
            fileCount: resolvedFiles.length,
            toolCallCount: toolCallRecords.length,
          },
        });
      }

      if (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'Stream error';
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'failed',
          errorMessage: message,
        });
        await writeErrorEvent(stream, message);
        return;
      }

      try {
        if (!assistantText.trim() && !pendingToolCall) {
          throw new Error('No reply was generated');
        }
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'saving',
        });
        await writeGenerationEvent(stream, { type: 'status', generationId, status: 'saving' });
        const beforeCommit = await ChatRepository.getGenerationRun(
          db,
          chatId,
          generationId,
          userId,
        );
        if (beforeCommit?.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          return;
        }
        let audioFile: ChatMessageFileRecord | null = null;
        let audioRun: SynthesizedReplyAudio | null = null;
        if (responseModality === 'audio' && assistantText.trim().length > 0) {
          // Best-effort: the text reply already succeeded, so a speech
          // synthesis failure shouldn't fail the whole request — just skip
          // attaching audio and let the client fall back to text.
          audioRun = await synthesizeReplyAudioFile(userId, assistantText).catch(() => null);
          audioFile = audioRun?.file ?? null;
        }

        const committed = await runInTransaction(async (trx) => {
          const assistantMessage = await ChatRepository.insertMessage(trx, {
            chatId,
            authorUserId: userId,
            role: 'assistant',
            content: resolveAssistantContent(assistantText, pendingToolCall),
            files: audioFile ? [audioFile] : null,
            reasoning: reasoningText,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : null,
          });
          await ChatRepository.touchLastMessage(trx, chatId);
          await ChatRepository.updateGenerationRun(trx, {
            id: generationId,
            ownerUserId: userId,
            status: 'committed',
            assistantMessageId: assistantMessage.id,
          });
          return ChatRepository.getMessageById(trx, chatId, assistantMessage.id);
        });
        if (audioRun) {
          if (!committed) {
            throw new Error('Assistant message was not committed');
          }
          const speechRunId = randomUUID();
          await ChatSpeechRunRepository.create(db, {
            id: speechRunId,
            messageId: committed.id,
            ownerUserId: userId,
            usageEventId: audioRun.eventId,
            provider: 'openrouter',
            characterCount: assistantText.length,
          });
          if (audioRun.generationId) {
            await ChatSpeechRunRepository.setProviderGenerationId(db, {
              id: speechRunId,
              providerGenerationId: audioRun.generationId,
            });
          }
          await ChatSpeechRunRepository.markComplete(db, {
            id: speechRunId,
            status: audioRun.status,
          });
          await ChatSpeechRunRepository.markReconciliation(db, {
            id: speechRunId,
            status: audioRun.usageAvailable ? 'succeeded' : 'failed',
            ...(audioRun.usageAvailable ? {} : { error: 'Speech pricing was unavailable' }),
          });
        }
        await enqueueChatEmbedding(userId, chatId);

        if (!committed) throw new Error('Saved reply could not be loaded');
        await writeGenerationEvent(stream, {
          type: 'committed',
          generationId,
          message: toChatMessageDto(committed),
        });
        if (pendingToolCall) {
          await writeGenerationEvent(stream, {
            type: 'tool-confirmation-required',
            generationId,
            messageId: committed.id,
            toolCallId: pendingToolCall.toolCallId,
            toolName: pendingToolCall.toolName,
            args: pendingToolCall.args,
            preview: pendingToolCall.preview,
          });
        }
        await stream.writeSSE({ data: '[DONE]' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream error';
        const run = await ChatRepository.getGenerationRun(db, chatId, generationId, userId);
        if (run?.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          return;
        }
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'failed',
          errorMessage: message,
        });
        await writeErrorEvent(stream, message);
      }
    });
  });

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const includeArchived = c.req.query('includeArchived') === 'true';
    const chats = await ChatRepository.listForUser(db, userId, 100, { includeArchived });
    return c.json(chats.map(toChatDto));
  })
  .post('/', zValidator('json', ChatsCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { title } = c.req.valid('json');
    const chat = await ChatRepository.create(db, { userId, title });
    return c.json(toChatDto(chat), 201);
  })
  .post('/start-stream', zValidator('json', ChatsStartStreamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const {
      generationId,
      title,
      message,
      fileIds = [],
      noteIds = [],
      responseLength,
    } = c.req.valid('json');

    // `/start-stream` has no chatId yet, so a retried generationId can't be
    // looked up the way `/stream`/`/regenerate` do — fall back to a
    // chat-agnostic lookup by the run's own (globally unique) id.
    const existingRun = await ChatRepository.getGenerationRunById(db, generationId, userId);
    if (existingRun) {
      return streamSSE(c, async (stream) => {
        if (existingRun.status === 'committed' && existingRun.assistantMessageId) {
          const committed = await ChatRepository.getMessageById(
            db,
            existingRun.chatId,
            existingRun.assistantMessageId,
          );
          if (committed) {
            await writeGenerationEvent(stream, {
              type: 'committed',
              generationId,
              message: toChatMessageDto(committed),
            });
          }
        } else if (existingRun.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
        } else {
          await writeGenerationEvent(stream, {
            type: 'status',
            generationId,
            status: existingRun.status === 'saving' ? 'saving' : 'preparing',
          });
        }
        await stream.writeSSE({ data: '[DONE]' });
      });
    }

    const resolvedNotes = await ChatRepository.resolveReferencedNotes(db, userId, noteIds, message);
    const resolvedFiles = await ChatRepository.resolveChatFiles(db, userId, fileIds);
    const storedUserContent = toStoredUserMessageContent(message, resolvedNotes, resolvedFiles);
    if (!storedUserContent) {
      throw new ValidationError('Message, notes, or files are required');
    }

    const chatWithUserMessage = await runInTransaction(async (trx) => {
      const createdChat = await ChatRepository.create(trx, {
        userId,
        title,
        noteId: resolvedNotes.length === 1 ? resolvedNotes[0].id : null,
      });
      const userMessage = await ChatRepository.insertMessage(trx, {
        chatId: createdChat.id,
        authorUserId: userId,
        role: 'user',
        content: storedUserContent,
        files: resolvedFiles.length > 0 ? resolvedFiles : null,
        referencedNoteIds: resolvedNotes.length > 0 ? resolvedNotes.map((note) => note.id) : null,
      });
      await ChatRepository.touchLastMessage(trx, createdChat.id);
      await ChatRepository.createGenerationRun(trx, {
        id: generationId,
        chatId: createdChat.id,
        ownerUserId: userId,
        kind: 'start',
        userMessageId: userMessage.id,
      });
      return { chat: createdChat, userMessageId: userMessage.id };
    });
    const chat = chatWithUserMessage.chat;
    const userMessage = await ChatRepository.getMessageById(
      db,
      chat.id,
      chatWithUserMessage.userMessageId,
    );

    const currentUserContent = formatUserContentWithContext(message, resolvedNotes, resolvedFiles);
    const chatMessages = buildMessages([], currentUserContent, getSystemPrompt(responseLength));
    const chatToolPlan = await planChatTools({ model: CHAT_MODEL, messages: chatMessages });
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    return streamSSE(c, async (stream) => {
      let assistantText = '';
      let reasoningText: string | null = null;
      let toolCallRecords: Awaited<ReturnType<typeof runCompletionWithTools>>['toolCallRecords'] =
        [];
      let pendingToolCall: Awaited<ReturnType<typeof runCompletionWithTools>>['pendingToolCall'] =
        null;
      let usage: ReturnType<typeof getChatCompletionUsage> = null;
      let streamError: unknown = null;

      await writeGenerationEvent(stream, {
        type: 'accepted',
        generationId,
        chatId: chat.id,
        chat: toChatDto(chat),
        userMessage: userMessage ? toChatMessageDto(userMessage) : null,
      });
      await writeGenerationEvent(stream, { type: 'status', generationId, status: 'preparing' });

      try {
        const result = await runCompletionWithTools({
          userId,
          model: CHAT_MODEL,
          messages: chatMessages,
          tools: chatToolPlan.tools,
          requiresToolCall: chatToolPlan.requiresLookup,
          maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
          reasoning: getReasoningConfig(responseLength),
          onEvent: (event) => writeGenerationEvent(stream, { ...event, generationId }),
        });
        assistantText = result.assistantText;
        reasoningText = result.reasoningText;
        toolCallRecords = result.toolCallRecords;
        pendingToolCall = result.pendingToolCall;
        usage = result.usage;
      } catch (error) {
        streamError = error;
      } finally {
        await recordAIUsageEvent({
          eventId,
          userId,
          feature: 'chat_stream',
          operation: 'chat_completion',
          usage,
          status: streamError ? 'failed' : 'succeeded',
          error: streamError,
          durationMs: getDurationMs(),
          metadata: {
            chatId: chat.id,
            noteCount: resolvedNotes.length,
            fileCount: resolvedFiles.length,
            toolCallCount: toolCallRecords.length,
          },
        });
      }

      if (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'Stream error';
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'failed',
          errorMessage: message,
        });
        await writeErrorEvent(stream, message);
        return;
      }

      try {
        if (!assistantText.trim() && !pendingToolCall) {
          throw new Error('No reply was generated');
        }
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'saving',
        });
        await writeGenerationEvent(stream, { type: 'status', generationId, status: 'saving' });
        const beforeCommit = await ChatRepository.getGenerationRun(
          db,
          chat.id,
          generationId,
          userId,
        );
        if (beforeCommit?.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          return;
        }
        const committed = await runInTransaction(async (trx) => {
          const assistantMessage = await ChatRepository.insertMessage(trx, {
            chatId: chat.id,
            authorUserId: userId,
            role: 'assistant',
            content: resolveAssistantContent(assistantText, pendingToolCall),
            reasoning: reasoningText,
            toolCalls: toolCallRecords.length > 0 ? toolCallRecords : null,
          });
          await ChatRepository.touchLastMessage(trx, chat.id);
          await ChatRepository.updateGenerationRun(trx, {
            id: generationId,
            ownerUserId: userId,
            status: 'committed',
            assistantMessageId: assistantMessage.id,
          });
          return ChatRepository.getMessageById(trx, chat.id, assistantMessage.id);
        });
        await enqueueChatEmbedding(userId, chat.id);

        if (!committed) throw new Error('Saved reply could not be loaded');
        await writeGenerationEvent(stream, {
          type: 'committed',
          generationId,
          message: toChatMessageDto(committed),
        });
        if (pendingToolCall) {
          await writeGenerationEvent(stream, {
            type: 'tool-confirmation-required',
            generationId,
            messageId: committed.id,
            toolCallId: pendingToolCall.toolCallId,
            toolName: pendingToolCall.toolName,
            args: pendingToolCall.args,
            preview: pendingToolCall.preview,
          });
        }
        await stream.writeSSE({ data: '[DONE]' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream error';
        const run = await ChatRepository.getGenerationRun(db, chat.id, generationId, userId);
        if (run?.status === 'cancelled') {
          await writeGenerationEvent(stream, { type: 'cancelled', generationId });
          return;
        }
        await ChatRepository.updateGenerationRun(db, {
          id: generationId,
          ownerUserId: userId,
          status: 'failed',
          errorMessage: message,
        });
        await writeErrorEvent(stream, message);
      }
    });
  })
  .route('/:id', chatByIdRoutes);
