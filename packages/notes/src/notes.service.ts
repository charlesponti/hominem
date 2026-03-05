import { db } from '@hominem/db';
import { and, desc, eq, inArray, or, type SQLWrapper, sql } from '@hominem/db';
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { NoteStatus, NoteOutput, NoteInput, NoteSyncItem, PublishingMetadata } from './contracts';

import type { CreateNoteInput, ListNotesInput, ListNotesOutput, UpdateNoteInput } from './types';
import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  UpdateNoteZodSchema,
} from './types';
import { assertAllowedTransition, ConflictError } from './note.state.service';

const notesTable = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  title: text('title'),
  content: text('content'),
  excerpt: text('excerpt'),
  mentions: jsonb('mentions'),
  analysis: jsonb('analysis'),
  publishingMetadata: jsonb('publishing_metadata'),
  parentNoteId: uuid('parent_note_id'),
  versionNumber: integer('version_number').default(1).notNull(),
  isLatestVersion: boolean('is_latest_version').default(true).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'string' }),
  source: text('source'),
  isLocked: boolean('is_locked').default(false),
  folder: text('folder'),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

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
  private requireRow<T>(value: T | undefined, message: string): T {
    if (value === undefined) {
      throw new Error(message);
    }
    return value;
  }

  private requireHydrated(note: NoteOutput | undefined): NoteOutput {
    if (!note) {
      throw new Error('Failed to hydrate note tags');
    }
    return note;
  }

  private normalizeTagValues(tags: Array<{ value: string }> | null | undefined): string[] {
    if (!tags || tags.length === 0) {
      return [];
    }
    const normalized = new Set<string>();
    for (const tag of tags) {
      const value = tag.value.trim();
      if (value.length > 0) {
        normalized.add(value);
      }
    }
    return Array.from(normalized);
  }

  private async syncNoteTags(noteId: string, userId: string, tags: Array<{ value: string }> | null): Promise<void> {
    if (tags === null) {
      await db.execute(sql`delete from note_tags where note_id = ${noteId}`);
      return;
    }

    const normalizedNames = this.normalizeTagValues(tags);
    await db.execute(sql`delete from note_tags where note_id = ${noteId}`);

    if (normalizedNames.length === 0) {
      return;
    }

    for (const name of normalizedNames) {
      await db.execute(sql`
        insert into tags (owner_id, name)
        values (${userId}, ${name})
        on conflict (owner_id, name) do nothing
      `);
    }

    await db.execute(sql`
      insert into note_tags (note_id, tag_id)
      select ${noteId}, t.id
      from tags t
      where t.owner_id = ${userId}
        and ${inArray(sql`t.name`, normalizedNames)}
      on conflict (note_id, tag_id) do nothing
    `);
  }

  private async getTagsByNoteIds(
    noteIds: string[],
    userId: string,
  ): Promise<Map<string, Array<{ value: string }>>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const rows = (await db.execute(sql<{
      noteId: string;
      tagValue: string;
    }>`
      select nt.note_id as "noteId", t.name as "tagValue"
      from note_tags nt
      inner join tags t on t.id = nt.tag_id
      where ${inArray(sql`nt.note_id`, noteIds)}
        and t.owner_id = ${userId}
      order by nt.note_id asc, t.name asc
    `)) as Array<{ noteId: string; tagValue: string }>;

    const map = new Map<string, Array<{ value: string }>>();
    for (const row of rows) {
      const current = map.get(row.noteId) ?? [];
      current.push({ value: row.tagValue });
      map.set(row.noteId, current);
    }
    return map;
  }

  private async hydrateTags(
    noteRows: Array<typeof notesTable.$inferSelect>,
    userId: string,
  ): Promise<NoteOutput[]> {
    const tagsByNoteId = await this.getTagsByNoteIds(
      noteRows.map((row) => row.id),
      userId,
    );
    return noteRows.map((row) => ({
      ...row,
      tags: tagsByNoteId.get(row.id) ?? [],
    })) as NoteOutput[];
  }

  private buildInsertValues(input: NoteInput): typeof notesTable.$inferInsert {
    return {
      id: input.id,
      userId: input.userId,
      type: input.type ?? 'note',
      status: input.status ?? 'draft',
      title: input.title,
      content: input.content ?? '',
      excerpt: input.excerpt,
      mentions: input.mentions,
      analysis: input.analysis,
      publishingMetadata: input.publishingMetadata,
      parentNoteId: input.parentNoteId,
      versionNumber: input.versionNumber,
      isLatestVersion: input.isLatestVersion,
      publishedAt: input.publishedAt,
      scheduledFor: input.scheduledFor,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  async create(input: NoteInput): Promise<NoteOutput> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create note');
    }

    const [resultRow] = await db.insert(notesTable).values(this.buildInsertValues(input)).returning();
    const result = this.requireRow(resultRow, 'Failed to create note');
    await this.syncNoteTags(result.id, input.userId, input.tags ?? []);
    const [hydrated] = await this.hydrateTags([result], input.userId);
    return this.requireHydrated(hydrated);
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

    const conditions: SQLWrapper[] = [eq(notesTable.userId, userId)];

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = filters.types.map((type) =>
        eq(notesTable.type, type as NoteOutput['type']),
      );
      conditions.push(or(...typeFilters) as SQLWrapper);
    }

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      const statusFilters: SQLWrapper[] = filters.status.map((status) => eq(notesTable.status, status));
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
      setweight(to_tsvector('english', coalesce(${notesTable.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notesTable.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(t.name, ' ') FROM note_tags nt INNER JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = ${notesTable.id}), '')), 'C') ||
      setweight(to_tsvector('english', coalesce(${notesTable.excerpt}, '')), 'D')
    )`;

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`);
    }

    // Tag filtering (exact match)
    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`exists (
          select 1
          from note_tags nt
          inner join tags t on t.id = nt.tag_id
          where nt.note_id = ${notesTable.id}
            and t.owner_id = ${userId}
            and t.name = ${tag}
        )`);
      }
    }

    // Date filtering
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString();
        conditions.push(sql`${notesTable.updatedAt} > ${sinceDate}`);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    // Build the base query
    const baseQuery = db
      .select()
      .from(notesTable)
      .where(and(...conditions.filter((c) => !!c)));

    // biome-ignore lint/suspicious/noImplicitAnyLet: Query type is complex and inferred correctly
    let orderedQuery;
    if (ftsQuery) {
      // Order by relevance (full-text rank), then by recency
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(notesTable.updatedAt),
      );
    } else {
      // Order by recency only
      orderedQuery = baseQuery.orderBy(desc(notesTable.updatedAt));
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
      .from(notesTable)
      .where(and(...conditions.filter((c) => !!c)));

    const total = countResult[0]?.count ?? 0;
    const results = await orderedQuery;
    const hydrated = await this.hydrateTags(results, userId);

    return {
      notes: hydrated,
      total,
    };
  }

  async getById(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve note');
    }
    const [item] = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .limit(1);
    if (!item) {
      throw new NotFoundError('Note not found');
    }
    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
  }

  async update(input: UpdateNoteInput): Promise<NoteOutput> {
    const validatedInput = UpdateNoteZodSchema.parse(input);

    const updateData: Partial<typeof notesTable.$inferInsert> = {};
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
    if (validatedInput.publishingMetadata !== undefined) {
      updateData.publishingMetadata =
        validatedInput.publishingMetadata === null ? undefined : validatedInput.publishingMetadata;
    }
    if (validatedInput.analysis !== undefined) {
      updateData.analysis = validatedInput.analysis === null ? undefined : validatedInput.analysis;
    }

    if (Object.keys(updateData).length === 0 && validatedInput.tags === undefined) {
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    if (Object.keys(updateData).length === 0) {
      await this.syncNoteTags(validatedInput.id, validatedInput.userId, validatedInput.tags ?? []);
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    updateData.updatedAt = new Date().toISOString();

    const [item] = await db
      .update(notesTable)
      .set(updateData)
      .where(and(eq(notesTable.id, validatedInput.id), eq(notesTable.userId, validatedInput.userId)))
      .returning();
    if (!item) {
      throw new NotFoundError('Note not found or not authorized to update');
    }
    if (validatedInput.tags !== undefined) {
      await this.syncNoteTags(validatedInput.id, validatedInput.userId, validatedInput.tags);
    }
    const [hydrated] = await this.hydrateTags([item], validatedInput.userId);
    return this.requireHydrated(hydrated);
  }

  async delete(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete note');
    }
    const [item] = await db
      .delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();
    if (!item) {
      throw new NotFoundError('Note not found or not authorized to delete');
    }
    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
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

    const existingNote = await this.getById(id, userId);
    const now = new Date().toISOString();
    const updateData: Partial<typeof notesTable.$inferInsert> = {
      status: 'published',
      updatedAt: now,
    };

    // Handle scheduling
    if (publishData?.scheduledFor) {
      if (existingNote.status !== 'draft') {
        throw new ConflictError(`Cannot schedule note from ${existingNote.status} state`);
      }
      updateData.status = 'draft'; // Keep as draft until scheduled time
      updateData.scheduledFor = publishData.scheduledFor;
    } else {
      assertAllowedTransition(existingNote.status, 'published', 'publish');
      updateData.publishedAt = now;
    }

    // Build publishing metadata
    if (publishData) {
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
      .update(notesTable)
      .set(updateData)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to publish');
    }

    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
  }

  /**
   * Archive a note - marks it as archived
   */
  async archive(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to archive note');
    }

    const existingNote = await this.getById(id, userId);
    assertAllowedTransition(existingNote.status, 'archived', 'archive');

    const [item] = await db
      .update(notesTable)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to archive');
    }

    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
  }

  /**
   * Unpublish a note - reverts it to draft status
   */
  async unpublish(id: string, userId: string): Promise<NoteOutput> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to unpublish note');
    }

    const existingNote = await this.getById(id, userId);
    assertAllowedTransition(existingNote.status, 'draft', 'unpublish');

    const [item] = await db
      .update(notesTable)
      .set({
        status: 'draft',
        publishedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Note not found or not authorized to unpublish');
    }

    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
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
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))
      .limit(1);

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Determine the root note ID (the one with no parent, or this note's parent)
    const rootNoteId = note.parentNoteId || note.id;

    // Get all versions: the root note and all notes with this root as parent
    const versions = await db
      .select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.userId, userId),
          or(eq(notesTable.id, rootNoteId), eq(notesTable.parentNoteId, rootNoteId)),
        ),
      )
      .orderBy(notesTable.versionNumber);

    return this.hydrateTags(versions, userId);
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

    const conditions: SQLWrapper[] = [eq(notesTable.userId, userId), eq(notesTable.isLatestVersion, true)];

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = filters.types.map((type) =>
        eq(notesTable.type, type as NoteOutput['type']),
      );
      conditions.push(or(...typeFilters) as SQLWrapper);
    }

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      const statusFilters: SQLWrapper[] = filters.status.map((status) => eq(notesTable.status, status));
      conditions.push(or(...statusFilters) as SQLWrapper);
    }

    // Full-Text Search logic
    let ftsQuery = '';
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim();
    }

    // Define the tsvector construction SQL for ranking
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${notesTable.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notesTable.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(t.name, ' ') FROM note_tags nt INNER JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id = ${notesTable.id}), '')), 'C') ||
      setweight(to_tsvector('english', coalesce(${notesTable.excerpt}, '')), 'D')
    )`;

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`);
    }

    // Tag filtering (exact match)
    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`exists (
          select 1
          from note_tags nt
          inner join tags t on t.id = nt.tag_id
          where nt.note_id = ${notesTable.id}
            and t.owner_id = ${userId}
            and t.name = ${tag}
        )`);
      }
    }

    // Date filtering
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString();
        conditions.push(sql`${notesTable.updatedAt} > ${sinceDate}`);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    // Build the base query
    const baseQuery = db
      .select()
      .from(notesTable)
      .where(and(...conditions.filter((c) => !!c)));

    // biome-ignore lint/suspicious/noImplicitAnyLet: Query type is complex and inferred correctly
    let orderedQuery;
    if (ftsQuery) {
      // Order by relevance (full-text rank), then by recency
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(notesTable.updatedAt),
      );
    } else {
      // Order by recency only
      orderedQuery = baseQuery.orderBy(desc(notesTable.updatedAt));
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
      .from(notesTable)
      .where(and(...conditions.filter((c) => !!c)));

    const total = countResult[0]?.count ?? 0;
    const results = await orderedQuery;
    const hydrated = await this.hydrateTags(results, userId);

    return {
      notes: hydrated,
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
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))
      .limit(1);

    if (!originalNote) {
      throw new NotFoundError('Note not found');
    }

    // Mark current version as not latest
    await db.update(notesTable).set({ isLatestVersion: false }).where(eq(notesTable.id, noteId));

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
      await db.update(notesTable).set({ isLatestVersion: true }).where(eq(notesTable.id, noteId));
      throw new Error('Failed to generate AI content');
    }

    // Determine the root parent note ID
    // If the original note already has a parent, use that parent
    // Otherwise, use the original note ID as the parent
    const rootParentId = originalNote.parentNoteId || originalNote.id;

    // Calculate the next version number
    const nextVersionNumber = originalNote.versionNumber + 1;

    // Create new note with AI-generated content
    const [newNoteRow] = await db
      .insert(notesTable)
      .values({
        userId: originalNote.userId,
        type: originalNote.type,
        status: originalNote.status,
        title: originalNote.title,
        content: aiGeneratedContent,
        excerpt: originalNote.excerpt,
        mentions: originalNote.mentions,
        parentNoteId: rootParentId,
        versionNumber: nextVersionNumber,
        isLatestVersion: true,
        analysis: originalNote.analysis,
        publishingMetadata: originalNote.publishingMetadata,
      })
      .returning();
    const newNote = this.requireRow(newNoteRow, 'Failed to create developed note');

    await db.execute(sql`
      insert into note_tags (note_id, tag_id)
      select ${newNote.id}, nt.tag_id
      from note_tags nt
      where nt.note_id = ${originalNote.id}
      on conflict (note_id, tag_id) do nothing
    `);

    const [hydrated] = await this.hydrateTags([newNote], userId);
    return this.requireHydrated(hydrated);
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
