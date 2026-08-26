import { randomUUID } from 'node:crypto';

import { generateNoteFromChat } from '@hominem/ai';
import { db, NoteRepository, VectorDocumentRepository } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  assertUnderMonthlyUsageLimit,
  recordAIUsageEvent,
  startAIUsageTimer,
} from '../../application/ai-usage.service';
import { NoteService } from '../../application/notes.service';
import {
  CreateNoteInputSchema,
  GenerateNoteFromChatInputSchema,
  NoteParamSchema,
  NoteSearchQuerySchema,
  UpdateNoteInputSchema,
} from '../../schemas/notes.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { CHAT_TO_NOTE_PROMPT } from '../prompts';
import { toNoteDto } from './notes.mapper';
const noteService = new NoteService();

async function enqueueNoteEmbedding(userId: string, noteId: string) {
  await embeddingQueue.add(
    'generate-embedding',
    { jobId: `note-${noteId}`, userId, entityType: 'note' as const, entityId: noteId },
    { jobId: `note-${noteId}`, removeOnComplete: true, removeOnFail: false },
  );
}

export const notesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/search', zValidator('query', NoteSearchQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const query = c.req.valid('query');
    const limit = query.limit ? Math.min(Number.parseInt(query.limit, 10), 20) : 10;

    const results = await NoteRepository.search(db, {
      userId,
      query: query.query,
      limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
    });

    return c.json(results);
  })
  .post('/', zValidator('json', CreateNoteInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');
    const note = await noteService.createNote(userId, {
      title: input.title ?? null,
      content: input.content,
      ...(input.fileIds ? { fileIds: input.fileIds } : {}),
    });
    await enqueueNoteEmbedding(userId, note.id);

    return c.json(toNoteDto(note), 201);
  })
  .use('/generate', rateLimitMiddleware({ bucket: 'ai-note-generate', windowSec: 60, max: 20 }))
  .post('/generate', zValidator('json', GenerateNoteFromChatInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { transcript, instruction } = c.req.valid('json');

    await assertUnderMonthlyUsageLimit(userId);

    const eventId = randomUUID();
    const getDurationMs = startAIUsageTimer();

    try {
      const generated = await generateNoteFromChat(
        { transcript, instruction },
        CHAT_TO_NOTE_PROMPT,
      );
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'note_generate',
        operation: 'chat_completion',
        usage: generated.usage,
        status: 'succeeded',
        durationMs: getDurationMs(),
        metadata: {
          instructionProvided: Boolean(instruction),
          transcriptLength: transcript.length,
        },
      });
      return c.json({ text: generated.text });
    } catch (error) {
      await recordAIUsageEvent({
        eventId,
        userId,
        feature: 'note_generate',
        operation: 'chat_completion',
        status: 'failed',
        error,
        durationMs: getDurationMs(),
      });
      logger.error('[ai/notes/generate] OpenRouter error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return c.json({ error: 'Note generation failed' }, 500);
    }
  })
  .get('/:id', zValidator('param', NoteParamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id } = c.req.valid('param');
    const note = await NoteRepository.load(db, id, userId);
    return c.json(toNoteDto(note));
  })
  .patch(
    '/:id',
    zValidator('param', NoteParamSchema),
    zValidator('json', UpdateNoteInputSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');

      const note = await noteService.updateNote(id, userId, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.fileIds ? { fileIds: input.fileIds } : {}),
      });
      await enqueueNoteEmbedding(userId, note.id);

      return c.json(toNoteDto(note));
    },
  )
  .delete('/:id', zValidator('param', NoteParamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id } = c.req.valid('param');

    const note = await NoteRepository.load(db, id, userId);
    await NoteRepository.hardDelete(db, { noteId: id, userId });
    await VectorDocumentRepository.deleteForEntity(db, 'note', id);

    return c.json(toNoteDto(note));
  });
