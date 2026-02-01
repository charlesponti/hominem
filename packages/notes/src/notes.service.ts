import type { NoteOutput, NoteInput, NoteSyncItem } from '@hominem/db/types/notes';

import { db } from '@hominem/db';
// Direct table import for DB operations
import { notes } from '@hominem/db/schema/notes';
import { and, desc, eq, or, type SQLWrapper, sql } from 'drizzle-orm';

import type { CreateNoteInput, ListNotesInput, ListNotesOutput, UpdateNoteInput } from './types';

import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  UpdateNoteZodSchema,
} from './types';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotesService {
  async create(input: NoteInput): Promise<NoteOutput> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create note');
    }

    const [result] = await db.insert(notes).values(input).returning();
    return result as NoteOutput;
  }

  /**
   * Query notes with multidimensional filtering and full-text search
   * Supports: full-text search, type filtering, tag filtering, and date range filtering
   */
  async query(
    userId: string,
    filters?: {
      query?: string | undefined;
      types?: string[] | undefined;
      tags?: string[] | undefined;
      since?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
  ): Promise<{ notes: NoteOutput[]; total: number }> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to query notes');
    }

    const conditions: SQLWrapper[] = [eq(notes.userId, userId)];

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = filters.types.map((type) =>
        eq(notes.type, type as NoteOutput['type']),
      );
      conditions.push(or(...typeFilters) as SQLWrapper);
    }

    // Full-Text Search logic
    let ftsQuery = '';
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim();
    }

    // Define the tsvector construction SQL for ranking
    // Weights: title (A) > content (B) > tags (C)
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${notes.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notes.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${notes.tags}) AS tag_item), '')), 'C')
    )`;

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`);
    }

    // Tag filtering (exact match)
    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`${notes.tags}::jsonb @> ${JSON.stringify([{ value: tag }])}::jsonb`);
      }
    }

    // Date filtering
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString();
        conditions.push(sql`${notes.updatedAt} > ${sinceDate}`);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    // Build the base query
    const baseQuery = db
      .select()
      .from(notes)
      .where(and(...conditions.filter((c) => !!c)));

    // biome-ignore lint/suspicious/noImplicitAnyLet: Query type is complex and inferred correctly
    let orderedQuery;
    if (ftsQuery) {
      // Order by relevance (full-text rank), then by recency
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(notes.updatedAt),
      );
    } else {
      // Order by recency only
      orderedQuery = baseQuery.orderBy(desc(notes.updatedAt));
    }

    // Apply pagination
    if (filters?.limit) {
      orderedQuery = orderedQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      orderedQuery = orderedQuery.offset(filters.offset);
    }

    // Get total count (without pagination)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(and(...conditions.filter((c) => !!c)));

    const total = countResult[0]?.count ?? 0;
    const results = await orderedQuery;

    return {
      notes: results as NoteOutput[],
      total,
    };
  }

  async getById(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve note');
    }
    const [item] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (!item) {
      throw new NotFoundError('NoteOutput not found');
    }
    return item as NoteOutput;
  }

  async update(input: UpdateNoteInput): Promise<NoteOutput> {
    const validatedInput = UpdateNoteZodSchema.parse(input);

    const updateData: Partial<typeof notes.$inferInsert> = {};
    if (validatedInput.type !== undefined) {
      updateData.type = validatedInput.type;
    }
    if (validatedInput.title !== undefined) {
      updateData.title = validatedInput.title;
    }
    if (validatedInput.content !== undefined) {
      updateData.content = validatedInput.content;
    }
    if (validatedInput.tags !== undefined) {
      updateData.tags = validatedInput.tags === null ? [] : validatedInput.tags;
    }
    if (validatedInput.taskMetadata !== undefined) {
      updateData.taskMetadata =
        validatedInput.taskMetadata === null ? undefined : validatedInput.taskMetadata;
    }
    if (validatedInput.analysis !== undefined) {
      updateData.analysis = validatedInput.analysis === null ? undefined : validatedInput.analysis;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    updateData.updatedAt = new Date().toISOString();
    updateData.synced = true;

    const [item] = await db
      .update(notes)
      .set(updateData)
      .where(and(eq(notes.id, validatedInput.id), eq(notes.userId, validatedInput.userId)))
      .returning();
    if (!item) {
      throw new NotFoundError('NoteOutput not found or not authorized to update');
    }
    return item as NoteOutput;
  }

  async delete(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete note');
    }
    const [item] = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!item) {
      throw new NotFoundError('NoteOutput not found or not authorized to delete');
    }
    return item as NoteOutput;
  }

  async sync(itemsToSync: NoteSyncItem[], userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to sync notes');
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      items: [] as { id: string; updatedAt: string; type: NoteOutput['type'] }[],
    };

    for (const item of itemsToSync) {
      try {
        if (item.id) {
          // Try to update existing item
          try {
            const updatedItem = await this.update({
              id: item.id,
              ...item,
              userId,
            });
            results.updated++;
            results.items.push({
              id: updatedItem.id,
              updatedAt: updatedItem.updatedAt,
              type: updatedItem.type,
            });
          } catch (error) {
            if (error instanceof NotFoundError) {
              // Item doesn't exist, create it
              const createdItem = await this.create({
                ...item,
                userId,
                id: item.id,
              });
              results.created++;
              results.items.push({
                id: createdItem.id,
                updatedAt: createdItem.updatedAt,
                type: createdItem.type,
              });
            } else {
              throw error;
            }
          }
        } else {
          // Create new item
          const createdItem = await this.create({
            ...item,
            userId,
          });
          results.created++;
          results.items.push({
            id: createdItem.id,
            updatedAt: createdItem.updatedAt,
            type: createdItem.type,
          });
        }
      } catch (error) {
        console.error('Sync error for item:', item, error);
        results.failed++;
      }
    }

    return results;
  }
}

export {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  UpdateNoteZodSchema,
} from './types';
export type {
  CreateNoteInput,
  ListNotesInput,
  ListNotesOutput,
  UpdateNoteInput,
  NoteSyncItem,
} from './types';

export const notesService = new NotesService();
