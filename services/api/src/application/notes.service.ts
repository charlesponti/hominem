import type { NoteKind, NoteRecord } from '@hominem/db/notes';
import { NoteRepository } from '@hominem/db/notes';
import { runInTransaction } from '@hominem/db/transaction';

interface CreateNoteParams {
  kind?: NoteKind;
  title?: string | null | undefined;
  content: string;
  fileIds?: string[];
}

interface UpdateNoteParams {
  title?: string | null | undefined;
  content?: string;
  fileIds?: string[];
}

export class NoteService {
  async createNote(userId: string, input: CreateNoteParams): Promise<NoteRecord> {
    // Need the explicit return type here — without it TS infers runInTransaction's T from
    // this whole callback before checking it, which is one of the slowest typecheck spans
    // in services/api (~765ms). Annotating it short-circuits that.
    return runInTransaction(async (trx): Promise<NoteRecord> => {
      const content = input.content.trim();
      // never auto-derive the title from content — only use it if it was actually passed in
      const title = input.title?.trim() || null;
      const excerpt = deriveExcerpt(content);

      const created = await NoteRepository.create(trx, {
        userId,
        kind: input.kind,
        title,
        content,
        excerpt,
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
    return runInTransaction(async (trx): Promise<NoteRecord> => {
      const existing = await NoteRepository.getOwnedOrThrow(trx, noteId, userId);
      const nextContent = input.content !== undefined ? input.content.trim() : existing.content;
      // same deal — only touch the title if it was explicitly sent
      const nextTitle = input.title !== undefined ? input.title?.trim() || null : existing.title;
      // but the excerpt always gets recomputed, since it just follows the content
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
