import { and, eq, or, sql, type SQLWrapper } from 'drizzle-orm'
import { db } from '../db'
import { notes } from '../db/schema/notes.schema'
import { NLPProcessor } from '../nlp'
import type { TextAnalysis } from '../schemas'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export type NoteInput = {
  content: string
  title?: string
  tags?: Array<{ value: string }>
  userId: string
}

export type UpdateNoteInput = Partial<NoteInput> & {
  noteId: string
  userId: string
}

export class NotesService {
  private nlpProcessor = new NLPProcessor()

  async create(input: NoteInput) {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create a note')
    }

    const [note] = await db
      .insert(notes)
      .values({
        content: input.content,
        title: input.title,
        tags: input.tags,
        userId: input.userId,
      })
      .returning()

    if (!note) {
      throw new Error('Failed to create note')
    }

    return note
  }

  async list(userId: string, query?: string, tags?: string[]) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to list notes')
    }

    const conditions: (SQLWrapper | undefined)[] = [eq(notes.userId, userId)]

    if (query) {
      const searchQuery = `%${query}%`
      const titleSearch = sql<SQLWrapper>`COALESCE(${notes.title}, '') ILIKE ${searchQuery}`
      const contentSearch = sql<SQLWrapper>`${notes.content} ILIKE ${searchQuery}`
      conditions.push(or(titleSearch, contentSearch))
    }

    if (tags?.length) {
      const tagConditions = tags.map(
        (tag) =>
          sql<SQLWrapper>`${notes.tags}::jsonb @> ANY(ARRAY[jsonb_build_object('value', ${tag})]::jsonb[])`
      )
      conditions.push(...tagConditions)
    }

    return db
      .select()
      .from(notes)
      .where(and(...conditions))
  }

  async update(input: UpdateNoteInput) {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to update note')
    }

    let analysis: TextAnalysis | undefined
    if (input.content) {
      analysis = await this.nlpProcessor.analyzeText(input.content)
    }

    const [note] = await db
      .update(notes)
      .set({
        ...(input.title && { title: input.title }),
        ...(input.content && { content: input.content, analysis }),
        ...(input.tags && { tags: input.tags }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notes.id, input.noteId), eq(notes.userId, input.userId)))
      .returning()

    if (!note) {
      throw new NotFoundError('Note not found')
    }

    return note
  }

  async delete(noteId: string, userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete note')
    }

    const [note] = await db
      .delete(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning()

    if (!note) {
      throw new NotFoundError('Note not found')
    }

    return note
  }

  async analyze(noteId: string, userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to analyze note')
    }

    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .limit(1)

    if (!note) {
      throw new NotFoundError('Note not found')
    }

    const analysis = await this.nlpProcessor.analyzeText(note.content)

    const [updatedNote] = await db
      .update(notes)
      .set({ analysis })
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .returning()

    return { analysis, note: updatedNote }
  }
}
