import { randomUUID } from 'node:crypto';

import { getChatCompletionUsage, streamChatCompletion } from '@hominem/ai';
import type { ChatMessageFileRecord, ChatMessageRecord, NoteContext } from '@hominem/db';
import { ChatRepository, db, runInTransaction } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';
import { fileStorageService } from '@hominem/storage';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import {
  ChatsCreateSchema,
  ChatsEditMessageSchema,
  ChatsMessagesQuerySchema,
  ChatsSearchMessagesQuerySchema,
  ChatsSendSchema,
  ChatsStartStreamSchema,
  ChatsUpdateSchema,
} from '../../schemas/chats.schema';
import { ValidationError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { CHAT_ASSISTANT_PROMPT, CHAT_RESPONSE_LENGTH_GUIDANCE } from '../prompts';
import { synthesizeChatReplySpeech } from './chat-speech.service';
import { toChatDto, toChatMessageDto, toStoredUserMessageContent } from './chats.mapper';

async function synthesizeReplyAudioFile(
  userId: string,
  assistantText: string,
): Promise<ChatMessageFileRecord | null> {
  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  const result = await synthesizeChatReplySpeech(assistantText);

  if (result.kind === 'error') {
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      usage: null,
      status: 'failed',
      error: result.message,
      durationMs: getDurationMs(),
      metadata: {},
    });
    return null;
  }

  try {
    const stored = await fileStorageService.storeFile(result.buffer, result.mimeType, userId, {
      originalName: 'reply.mp3',
    });

    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      usage: null,
      status: 'succeeded',
      durationMs: getDurationMs(),
      metadata: {},
    });

    return {
      type: 'audio',
      url: stored.url,
      filename: stored.originalName,
      mimeType: result.mimeType,
      size: result.buffer.byteLength,
    };
  } catch (error) {
    await recordAIUsageEvent({
      eventId,
      userId,
      feature: 'chat_speech',
      operation: 'speech',
      usage: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'File storage failed',
      durationMs: getDurationMs(),
      metadata: {},
    });
    return null;
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

function buildPrompt(
  message: string,
  history: ChatMessageRecord[],
  notes: NoteContext[],
  files: ChatMessageFileRecord[],
): string {
  const sections = [];

  if (history.length > 0) {
    sections.push(
      [
        'Conversation history:',
        ...history.map((entry, index) => `${index + 1}. ${entry.role}: ${entry.content}`),
      ].join('\n'),
    );
  }

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

function writeChunkEvent(
  stream: { writeSSE: (input: { data: string }) => Promise<void> },
  chunk: string,
) {
  return stream.writeSSE({ data: JSON.stringify({ type: 'chunk', chunk }) });
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
  .get('/messages/search', zValidator('query', ChatsSearchMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const { query, limit } = c.req.valid('query');
    const messages = await ChatRepository.searchMessages(db, chatId, query, limit);

    return c.json(messages.map(toChatMessageDto));
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
  .post('/stream', zValidator('json', ChatsSendSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);

    await assertUnderMonthlyUsageLimit(userId);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const {
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

    await runInTransaction(async (trx) => {
      await ChatRepository.insertMessage(trx, {
        chatId,
        authorUserId: userId,
        role: 'user',
        content: storedUserContent,
        files: resolvedFiles.length > 0 ? resolvedFiles : null,
        referencedNoteIds: resolvedNotes.length > 0 ? resolvedNotes.map((n) => n.id) : null,
      });
      await ChatRepository.touchLastMessage(trx, chatId);
    });
    const prompt = buildPrompt(message, history, resolvedNotes, resolvedFiles);
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();
    const completion = streamChatCompletion({
      messages: [
        { role: 'system', content: getSystemPrompt(responseLength) },
        { role: 'user', content: prompt },
      ],
      maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
      reasoning: getReasoningConfig(responseLength),
    });

    return streamSSE(c, async (stream) => {
      let assistantText = '';
      let usage: ReturnType<typeof getChatCompletionUsage> = null;
      let streamError: unknown = null;

      try {
        for await (const chunk of completion) {
          usage = getChatCompletionUsage(chunk) ?? usage;
          const text = chunk.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text.length > 0) {
            assistantText += text;
            await writeChunkEvent(stream, text);
          }
        }
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
          },
        });
      }

      if (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'Stream error';
        await writeErrorEvent(stream, message);
        return;
      }

      try {
        let audioFile: ChatMessageFileRecord | null = null;
        if (responseModality === 'audio' && assistantText.trim().length > 0) {
          // Best-effort: the text reply already succeeded, so a speech
          // synthesis failure shouldn't fail the whole request — just skip
          // attaching audio and let the client fall back to text.
          audioFile = await synthesizeReplyAudioFile(userId, assistantText).catch(() => null);
        }

        if (assistantText.trim().length > 0) {
          await runInTransaction(async (trx) => {
            await ChatRepository.insertMessage(trx, {
              chatId,
              authorUserId: userId,
              role: 'assistant',
              content: assistantText,
              files: audioFile ? [audioFile] : null,
            });
            await ChatRepository.touchLastMessage(trx, chatId);
          });
          await enqueueChatEmbedding(userId, chatId);
        }

        await stream.writeSSE({ data: '[DONE]' });

        if (audioFile?.url && audioFile.mimeType) {
          await stream.writeSSE({
            data: JSON.stringify({
              type: 'audio',
              url: audioFile.url,
              mimeType: audioFile.mimeType,
            }),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream error';
        await writeErrorEvent(stream, message);
      }
    });
  });

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const chats = await ChatRepository.listForUser(db, userId, 100);
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
    const { title, message, fileIds = [], noteIds = [], responseLength } = c.req.valid('json');

    const resolvedNotes = await ChatRepository.resolveReferencedNotes(db, userId, noteIds, message);
    const resolvedFiles = await ChatRepository.resolveChatFiles(db, userId, fileIds);
    const storedUserContent = toStoredUserMessageContent(message, resolvedNotes, resolvedFiles);
    if (!storedUserContent) {
      throw new ValidationError('Message, notes, or files are required');
    }

    const chat = await runInTransaction(async (trx) => {
      const createdChat = await ChatRepository.create(trx, {
        userId,
        title,
        noteId: resolvedNotes.length === 1 ? resolvedNotes[0].id : null,
      });
      await ChatRepository.insertMessage(trx, {
        chatId: createdChat.id,
        authorUserId: userId,
        role: 'user',
        content: storedUserContent,
        files: resolvedFiles.length > 0 ? resolvedFiles : null,
        referencedNoteIds: resolvedNotes.length > 0 ? resolvedNotes.map((note) => note.id) : null,
      });
      await ChatRepository.touchLastMessage(trx, createdChat.id);
      return createdChat;
    });

    const prompt = buildPrompt(message, [], resolvedNotes, resolvedFiles);
    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();
    const completion = streamChatCompletion({
      messages: [
        { role: 'system', content: getSystemPrompt(responseLength) },
        { role: 'user', content: prompt },
      ],
      maxTokens: responseLength ? RESPONSE_LENGTH_MAX_TOKENS[responseLength] : undefined,
      reasoning: getReasoningConfig(responseLength),
    });

    return streamSSE(c, async (stream) => {
      let assistantText = '';
      let usage: ReturnType<typeof getChatCompletionUsage> = null;
      let streamError: unknown = null;

      await stream.writeSSE({
        data: JSON.stringify({
          type: 'ready',
          chatId: chat.id,
          chat: toChatDto(chat),
        }),
      });

      try {
        for await (const chunk of completion) {
          usage = getChatCompletionUsage(chunk) ?? usage;
          const text = chunk.choices?.[0]?.delta?.content;
          if (typeof text === 'string' && text.length > 0) {
            assistantText += text;
            await writeChunkEvent(stream, text);
          }
        }
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
          },
        });
      }

      if (streamError) {
        const message = streamError instanceof Error ? streamError.message : 'Stream error';
        await writeErrorEvent(stream, message);
        return;
      }

      try {
        if (assistantText.trim().length > 0) {
          await runInTransaction(async (trx) => {
            await ChatRepository.insertMessage(trx, {
              chatId: chat.id,
              authorUserId: userId,
              role: 'assistant',
              content: assistantText,
            });
            await ChatRepository.touchLastMessage(trx, chat.id);
          });
          await enqueueChatEmbedding(userId, chat.id);
        }

        await stream.writeSSE({ data: '[DONE]' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream error';
        await writeErrorEvent(stream, message);
      }
    });
  })
  .route('/:id', chatByIdRoutes);
