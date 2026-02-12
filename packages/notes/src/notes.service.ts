import type { NoteStatus } from '@hominem/db/schema/notes';
import type {
  NoteOutput,
  NoteInput,
  NoteSyncItem,
  PublishingMetadata,
} from '@hominem/db/types/notes';

import { db } from '@hominem/db';
import { and, desc, eq, or, type SQLWrapper, sql } from '@hominem/db';
import { notes } from '@hominem/db/schema/notes';

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
   * Supports: full-text search, type filtering, tag filtering, status filtering, and date range filtering
   */
  async query(
    userId: string,
    filters?: {
      query?: string | undefined;
      types?: string[] | undefined;
      status?: NoteStatus[] | undefined;
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

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      const statusFilters: SQLWrapper[] = filters.status.map((status) => eq(notes.status, status));
      conditions.push(or(...statusFilters) as SQLWrapper);
    }

    // Full-Text Search logic
    let ftsQuery = '';
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim();
    }

    // Define the tsvector construction SQL for ranking
    // Weights: title (A) > content (B) > tags (C) > excerpt (D)
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${notes.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notes.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${notes.tags}) AS tag_item), '')), 'C') ||
      setweight(to_tsvector('english', coalesce(${notes.excerpt}, '')), 'D')
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
      .select({ count: sql<number>`count(*)`.as('count') })
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
      throw new NotFoundError('Note not found');
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
    if (validatedInput.status !== undefined) {
      updateData.status = validatedInput.status;
    }
    if (validatedInput.excerpt !== undefined) {
      updateData.excerpt = validatedInput.excerpt;
    }
    if (validatedInput.tags !== undefined) {
      updateData.tags = validatedInput.tags === null ? [] : validatedInput.tags;
    }
    if (validatedInput.publishingMetadata !== undefined) {
      updateData.publishingMetadata =
        validatedInput.publishingMetadata === null ? undefined : validatedInput.publishingMetadata;
    }
    if (validatedInput.analysis !== undefined) {
      updateData.analysis = validatedInput.analysis === null ? undefined : validatedInput.analysis;
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    updateData.updatedAt = new Date().toISOString();

    const [item] = await db
      .update(notes)
      .set(updateData)
      .where(and(eq(notes.id, validatedInput.id), eq(notes.userId, validatedInput.userId)))
      .returning();
    if (!item) {
      throw new NotFoundError('Note not found or not authorized to update');
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
      throw new NotFoundError('Note not found or not authorized to delete');
    }
    return item as NoteOutput;
  }

  /**
   * Publish a note - marks it as published with optional platform metadata
   */
  async publish(
    id: string,
    userId: string,
    publishData?: {
      platform?: string;
      url?: string;
      externalId?: string;
      scheduledFor?: string;
      seo?: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
        canonicalUrl?: string;
        featuredImage?: string;
      };
    },
  ): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to publish note');
    }

    const now = new Date().toISOString();
    const updateData: Partial<typeof notes.$inferInsert> = {
      status: 'published',
      updatedAt: now,
    };

    // Handle scheduling
    if (publishData?.scheduledFor) {
      updateData.status = 'draft'; // Keep as draft until scheduled time
      updateData.scheduledFor = publishData.scheduledFor;
    } else {
      updateData.publishedAt = now;
    }

    // Build publishing metadata
    if (publishData) {
      const existingNote = await this.getById(id, userId);
      const existingMetadata = existingNote.publishingMetadata || {};

      updateData.publishingMetadata = {
        ...existingMetadata,
        ...(publishData.platform && { platform: publishData.platform }),
        ...(publishData.url && { url: publishData.url }),
        ...(publishData.externalId && { externalId: publishData.externalId }),
        ...(publishData.seo && { seo: publishData.seo }),
        ...(publishData.scheduledFor && { scheduledFor: publishData.scheduledFor }),
      } as PublishingMetadata;
    }

    const [item] = await db
      .update(notes)
      .set(updateData)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to publish');
    }

    return item as NoteOutput;
  }

  /**
   * Archive a note - marks it as archived
   */
  async archive(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to archive note');
    }

    const [item] = await db
      .update(notes)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to archive');
    }

    return item as NoteOutput;
  }

  /**
   * Unpublish a note - reverts it to draft status
   */
  async unpublish(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to unpublish note');
    }

    const [item] = await db
      .update(notes)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to unpublish');
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

  /**
   * Get all versions of a note in chronological order
   * Finds the root note and returns all versions in the chain
   */
  async getNoteVersions(noteId: string, userId: string): Promise<NoteOutput[]> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve note versions');
    }

    // First, get the note to find the root parent
    const [note] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .limit(1);

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Determine the root note ID (the one with no parent, or this note's parent)
    const rootNoteId = note.parentNoteId || note.id;

    // Get all versions: the root note and all notes with this root as parent
    const versions = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          or(eq(notes.id, rootNoteId), eq(notes.parentNoteId, rootNoteId)),
        ),
      )
      .orderBy(notes.versionNumber);

    return versions as NoteOutput[];
  }

  /**
   * Get latest notes only (isLatestVersion = true)
   * Modified query method that filters for the feed
   */
  async getLatestNotes(
    userId: string,
    filters?: {
      query?: string | undefined;
      types?: string[] | undefined;
      status?: NoteStatus[] | undefined;
      tags?: string[] | undefined;
      since?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
  ): Promise<{ notes: NoteOutput[]; total: number }> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to query notes');
    }

    const conditions: SQLWrapper[] = [eq(notes.userId, userId), eq(notes.isLatestVersion, true)];

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = filters.types.map((type) =>
        eq(notes.type, type as NoteOutput['type']),
      );
      conditions.push(or(...typeFilters) as SQLWrapper);
    }

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      const statusFilters: SQLWrapper[] = filters.status.map((status) => eq(notes.status, status));
      conditions.push(or(...statusFilters) as SQLWrapper);
    }

    // Full-Text Search logic
    let ftsQuery = '';
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim();
    }

    // Define the tsvector construction SQL for ranking
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${notes.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notes.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${notes.tags}) AS tag_item), '')), 'C') ||
      setweight(to_tsvector('english', coalesce(${notes.excerpt}, '')), 'D')
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
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(notes)
      .where(and(...conditions.filter((c) => !!c)));

    const total = countResult[0]?.count ?? 0;
    const results = await orderedQuery;

    return {
      notes: results as NoteOutput[],
      total,
    };
  }

  /**
   * Develop a note using AI
   * Creates a new version of the note with AI-generated content
   */
  async developNote(
    noteId: string,
    userId: string,
    developmentType: 'expand' | 'outline' | 'rewrite',
  ): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to develop note');
    }

    // Find the note by ID
    const [originalNote] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
      .limit(1);

    if (!originalNote) {
      throw new NotFoundError('Note not found');
    }

    // Mark current version as not latest
    await db.update(notes).set({ isLatestVersion: false }).where(eq(notes.id, noteId));

    // Call AI to generate content (placeholder implementation)
    // In production, this would use the AI SDK to generate actual content
    let aiGeneratedContent: string;
    try {
      // Placeholder: Just return the same content with a prefix
      // const { text } = await generateText({
      //   model: google('gemini-2.0-flash-exp'),
      //   prompt: `${developmentType}: ${originalNote.content}`,
      // })
      // aiGeneratedContent = text

      // For now, use a placeholder
      const prefix = developmentType.toUpperCase();
      aiGeneratedContent = `[${prefix}] ${originalNote.content}`;
    } catch (error) {
      console.error('AI generation error:', error);
      // If AI fails, restore the original note as latest and throw
      await db.update(notes).set({ isLatestVersion: true }).where(eq(notes.id, noteId));
      throw new Error('Failed to generate AI content');
    }

    // Determine the root parent note ID
    // If the original note already has a parent, use that parent
    // Otherwise, use the original note ID as the parent
    const rootParentId = originalNote.parentNoteId || originalNote.id;

    // Calculate the next version number
    const nextVersionNumber = originalNote.versionNumber + 1;

    // Create new note with AI-generated content
    const [newNote] = await db
      .insert(notes)
      .values({
        userId: originalNote.userId,
        type: originalNote.type,
        status: originalNote.status,
        title: originalNote.title,
        content: aiGeneratedContent,
        excerpt: originalNote.excerpt,
        tags: originalNote.tags,
        mentions: originalNote.mentions,
        parentNoteId: rootParentId,
        versionNumber: nextVersionNumber,
        isLatestVersion: true,
        analysis: originalNote.analysis,
        publishingMetadata: originalNote.publishingMetadata,
      })
      .returning();

    return newNote as NoteOutput;
  }
}

export {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  UpdateNoteZodSchema,
} from './types';
export type { CreateNoteInput, ListNotesInput, ListNotesOutput, UpdateNoteInput } from './types';

export const notesService = new NotesService();
