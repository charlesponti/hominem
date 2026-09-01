import { db, NoteRepository, NotFoundError, VectorDocumentRepository } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { NoteService } from '../../application/notes.service';
import {
  listMemoriesInputSchema,
  MemoryParamSchema,
  UpdateMemoryInputSchema,
} from '../../schemas/memory.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

// Memories are just notes with kind = 'memory' — see mcp/tools/memory.ts
// for the AI-facing surface over these same rows.
const MEMORY_KIND = 'memory' as const;

const noteService = new NoteService();

async function enqueueMemoryEmbedding(userId: string, noteId: string) {
  await embeddingQueue.add(
    'generate-embedding',
    { jobId: `note-${noteId}`, userId, entityType: 'note' as const, entityId: noteId },
    { jobId: `note-${noteId}`, removeOnComplete: true, removeOnFail: false },
  );
}

function toMemoryDto(note: {
  id: string;
  title: string | null;
  content: string;
  excerpt: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    excerpt: note.excerpt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function assertOwnedMemory(id: string, userId: string) {
  const note = await NoteRepository.getOwnedOrThrow(db, id, userId);
  if (note.kind !== MEMORY_KIND) {
    throw new NotFoundError('Memory', { id });
  }
}

export const memoryRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', listMemoriesInputSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { limit } = c.req.valid('query');
    const notes = await NoteRepository.list(db, {
      userId,
      kind: MEMORY_KIND,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: limit ?? 50,
    });
    return c.json({ memories: notes.map(toMemoryDto) });
  })
  .patch(
    '/:id',
    zValidator('param', MemoryParamSchema),
    zValidator('json', UpdateMemoryInputSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');

      await assertOwnedMemory(id, userId);
      const note = await noteService.updateNote(id, userId, {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
      });
      await enqueueMemoryEmbedding(userId, note.id);

      return c.json(toMemoryDto(note));
    },
  )
  .delete('/:id', zValidator('param', MemoryParamSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { id } = c.req.valid('param');

    await assertOwnedMemory(id, userId);
    const note = await NoteRepository.load(db, id, userId);
    await NoteRepository.hardDelete(db, { noteId: id, userId });
    await VectorDocumentRepository.deleteForEntity(db, 'note', id);

    return c.json(toMemoryDto(note));
  });
