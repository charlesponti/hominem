import { db, NoteRepository, VectorDocumentRepository } from '@hominem/db';
import { embeddingQueue } from '@hominem/queues';

import { NoteService } from '../../application/notes.service';
import {
  forgetMemoryInputSchema,
  forgetMemoryOutputSchema,
  listMemoriesInputSchema,
  listMemoriesOutputSchema,
  rememberInputSchema,
  rememberOutputSchema,
  searchMemoriesInputSchema,
  searchMemoriesOutputSchema,
} from '../../schemas/memory.schema';
import { registerTool } from '../tools';

// Marks a note as an assistant-managed memory via the otherwise-unused
// `app.notes.source` column — no schema change needed, and memories show up
// wherever notes already appear in the app.
const MEMORY_SOURCE = 'memory';

const noteService = new NoteService();

async function enqueueMemoryEmbedding(userId: string, noteId: string) {
  await embeddingQueue.add(
    'generate-embedding',
    { jobId: `note-${noteId}`, userId, entityType: 'note' as const, entityId: noteId },
    { jobId: `note-${noteId}`, removeOnComplete: true, removeOnFail: false },
  );
}

function toMemorySummary(note: { id: string; title: string | null; excerpt: string | null; createdAt: string }) {
  return { id: note.id, title: note.title, excerpt: note.excerpt, createdAt: note.createdAt };
}

registerTool(
  {
    name: 'remember',
    title: 'Remember something about the user',
    description:
      'Saves a durable fact, preference, or piece of personal context as a memory. Call this ' +
      'immediately when the user asks to be remembered something, or when a lasting fact about ' +
      'them surfaces naturally in conversation — no confirmation needed before saving.',
    inputSchema: rememberInputSchema,
    outputSchema: rememberOutputSchema,
    readOnly: false,
    scopes: ['memory:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
  },
  async (ownerUserId, input) => {
    const note = await noteService.createNote(ownerUserId, {
      title: input.title ?? null,
      content: input.content,
      source: MEMORY_SOURCE,
    });
    await enqueueMemoryEmbedding(ownerUserId, note.id);
    return toMemorySummary(note);
  },
);

registerTool(
  {
    name: 'list_memories',
    title: 'List remembered facts',
    description: 'Lists the most recently saved memories about the user, newest first.',
    inputSchema: listMemoriesInputSchema,
    outputSchema: listMemoriesOutputSchema,
    readOnly: true,
    scopes: ['memory:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const notes = await NoteRepository.list(db, {
      userId: ownerUserId,
      source: MEMORY_SOURCE,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: input.limit ?? 20,
    });
    return { memories: notes.map(toMemorySummary) };
  },
);

registerTool(
  {
    name: 'search_memories',
    title: 'Search remembered facts',
    description:
      'Searches saved memories by keyword. Call this before answering questions that plausibly ' +
      'depend on remembered personal context, rather than assuming none exists. If no keyword ' +
      'match is found, returns the full recent memory list instead so nothing is missed.',
    inputSchema: searchMemoriesInputSchema,
    outputSchema: searchMemoriesOutputSchema,
    readOnly: true,
    scopes: ['memory:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const limit = input.limit ?? 20;
    const notes = await NoteRepository.list(db, {
      userId: ownerUserId,
      source: MEMORY_SOURCE,
      query: input.query,
      limit,
    });
    // The underlying search is a plain substring match, so a query like "food
    // allergies" won't match a memory saved as "allergic to peanuts". Falling
    // back to the full (capped) memory list lets the model reason over the
    // actual content instead of silently reporting "nothing found" — cheap
    // for a personal-scale memory store.
    if (notes.length === 0) {
      const allNotes = await NoteRepository.list(db, {
        userId: ownerUserId,
        source: MEMORY_SOURCE,
        limit,
      });
      return { memories: allNotes.map(toMemorySummary) };
    }
    return { memories: notes.map(toMemorySummary) };
  },
);

registerTool(
  {
    name: 'forget_memory',
    title: 'Forget a remembered fact',
    description: 'Permanently deletes a saved memory.',
    inputSchema: forgetMemoryInputSchema,
    outputSchema: forgetMemoryOutputSchema,
    readOnly: false,
    scopes: ['memory:write'],
    sensitivity: 'sensitive',
    resultCap: 1,
    requiresConfirmation: true,
    preview: async (ownerUserId, input) => {
      const parsed = forgetMemoryInputSchema.safeParse(input);
      if (!parsed.success) return null;
      const note = await NoteRepository.getOwned(db, parsed.data.id, ownerUserId);
      if (!note || note.source !== MEMORY_SOURCE) return null;
      return { title: note.title ?? '(untitled)', excerpt: note.excerpt ?? note.content.slice(0, 200) };
    },
  },
  async (ownerUserId, input) => {
    const note = await NoteRepository.getOwned(db, input.id, ownerUserId);
    if (!note || note.source !== MEMORY_SOURCE) {
      return { removed: false };
    }
    await NoteRepository.hardDelete(db, { noteId: input.id, userId: ownerUserId });
    await VectorDocumentRepository.deleteForEntity(db, 'note', input.id);
    return { removed: true };
  },
);
