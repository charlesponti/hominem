import type { NoteRecord } from '@hominem/db';
import { NoteRepository, runInTransaction } from '@hominem/db';

interface CreateNoteParams {
  title?: string | null | undefined;
  content: string;
  fileIds?: string[];
  source?: string | null;
}

interface UpdateNoteParams {
  title?: string | null | undefined;
  content?: string;
  fileIds?: string[];
}

export class NoteService {
  async createNote(userId: string, input: CreateNoteParams): Promise<NoteRecord> {
    return runInTransaction(async (trx) => {
      const content = input.content.trim();
      // Title is only set when explicitly provided — never auto-derived from content
      const title = input.title?.trim() || null;
      const excerpt = deriveExcerpt(content);

      const created = await NoteRepository.create(trx, {
        userId,
        title,
        content,
        excerpt,
        source: input.source ?? null,
      });

      await NoteRepository.syncFiles(trx, {
        noteId: created.id,
        userId,
        fileIds: input.fileIds ?? [],
      });
      return NoteRepository.load(trx, created.id, userId);
    });
  }

  async updateNote(noteId: string, userId: string, input: UpdateNoteParams): Promise<NoteRecord> {
    return runInTransaction(async (trx) => {
      const existing = await NoteRepository.getOwnedOrThrow(trx, noteId, userId);
      const nextContent = input.content !== undefined ? input.content.trim() : existing.content;
      // Only update title when explicitly sent; never re-derive from content on updates
      const nextTitle = input.title !== undefined ? input.title?.trim() || null : existing.title;
      // Always recompute excerpt from current content
      const nextExcerpt = deriveExcerpt(nextContent);

      await NoteRepository.update(trx, {
        noteId,
        userId,
        input: {
          title: nextTitle,
          content: nextContent,
          excerpt: nextExcerpt,
        },
      });

      if (input.fileIds) {
        await NoteRepository.syncFiles(trx, { noteId, userId, fileIds: input.fileIds });
      }

      return NoteRepository.load(trx, noteId, userId);
    });
  }
}

function deriveExcerpt(content: string): string | null {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized.slice(0, 240) : null;
}
