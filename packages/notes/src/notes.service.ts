import { db } from '@hominem/db';
import type { Selectable } from 'kysely';
import type { Database } from '@hominem/db';

import type {
  NoteStatus,
  NoteOutput,
  NoteInput,
  NoteSyncItem,
  PublishingMetadata,
} from './contracts';
import { assertAllowedTransition, ConflictError } from './note.state.service';
import type { CreateNoteInput, ListNotesInput, ListNotesOutput, UpdateNoteInput } from './types';
import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  UpdateNoteZodSchema,
} from './types';

type NotesRow = Selectable<Database['notes']>;

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

  private async syncNoteTags(
    noteId: string,
    userId: string,
    tags: Array<{ value: string }> | null,
  ): Promise<void> {
    if (tags === null) {
      await db.deleteFrom('note_tags').where('note_id', '=', noteId).execute();
      return;
    }

    const normalizedNames = this.normalizeTagValues(tags);
    await db.deleteFrom('note_tags').where('note_id', '=', noteId).execute();

    if (normalizedNames.length === 0) {
      return;
    }

    for (const name of normalizedNames) {
      try {
        await db
          .insertInto('tags')
          .values({
            owner_id: userId,
            name,
          })
          .execute();
      } catch {
        // Tag already exists, continue
      }
    }

    const tagRecords = await db
      .selectFrom('tags')
      .select('id')
      .where('owner_id', '=', userId)
      .where('name', 'in', normalizedNames)
      .execute();

    for (const tagRecord of tagRecords) {
      try {
        await db
          .insertInto('note_tags')
          .values({
            note_id: noteId,
            tag_id: tagRecord.id,
          })
          .execute();
      } catch {
        // Relationship already exists, continue
      }
    }
  }

  private async getTagsByNoteIds(
    noteIds: string[],
    userId: string,
  ): Promise<Map<string, Array<{ value: string }>>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const rows = await db
      .selectFrom('note_tags')
      .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
      .select((eb) => [
        eb.ref('note_tags.note_id').as('noteId'),
        eb.ref('tags.name').as('tagValue'),
      ])
      .where('note_tags.note_id', 'in', noteIds)
      .where('tags.owner_id', '=', userId)
      .orderBy('note_tags.note_id', 'asc')
      .orderBy('tags.name', 'asc')
      .execute();

    const map = new Map<string, Array<{ value: string }>>();
    for (const row of rows) {
      const current = map.get(row.noteId) ?? [];
      current.push({ value: row.tagValue });
      map.set(row.noteId, current);
    }
    return map;
  }

  private async hydrateTags(noteRows: NotesRow[], userId: string): Promise<NoteOutput[]> {
    const tagsByNoteId = await this.getTagsByNoteIds(
      noteRows.map((row) => row.id),
      userId,
    );
    return noteRows.map((row) => ({
      ...(row as any),
      tags: tagsByNoteId.get(row.id) ?? [],
    })) as NoteOutput[];
  }

  async create(input: NoteInput): Promise<NoteOutput> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create note');
    }

    const resultRow = await db
      .insertInto('notes')
      .values({
        id: input.id,
        user_id: input.userId,
        type: input.type ?? 'note',
        status: input.status ?? 'draft',
        title: input.title,
        content: input.content ?? '',
        excerpt: input.excerpt,
        mentions: input.mentions,
        analysis: input.analysis,
        publishing_metadata: input.publishingMetadata,
        parent_note_id: input.parentNoteId,
        version_number: input.versionNumber,
        is_latest_version: input.isLatestVersion,
        published_at: input.publishedAt,
        scheduled_for: input.scheduledFor,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returningAll()
      .executeTakeFirst();

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

    let query = db.selectFrom('notes').selectAll().where('user_id', '=', userId);

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      query = query.where('type', 'in', filters.types);
    }

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }

    // Tag filtering (exact match)
    if (filters?.tags && filters.tags.length > 0) {
      const noteIdsWithTags = await db
        .selectFrom('note_tags')
        .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
        .select('note_tags.note_id')
        .where('tags.owner_id', '=', userId)
        .where('tags.name', 'in', filters.tags)
        .execute();

      if (noteIdsWithTags.length === 0) {
        return { notes: [], total: 0 };
      }

      const tagNoteIds = [...new Set(noteIdsWithTags.map((row) => row.note_id))];
      query = query.where('id', 'in', tagNoteIds);
    }

    // Date filtering
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since);
        query = query.where('updated_at', '>', sinceDate);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    // Full-text search (if query provided)
    if (filters?.query && filters.query.trim() !== '') {
      // Basic text search implementation using ILIKE
      const searchPattern = `%${filters.query.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('title', 'like', searchPattern),
          eb('content', 'like', searchPattern),
          eb('excerpt', 'like', searchPattern),
        ]),
      );
    }

    // Get total count (without pagination)
    const countResult = await db
      .selectFrom('notes')
      .select(db.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);

    // Apply ordering and pagination
    let results = await query
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0)
      .execute();

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
    const item = await db
      .selectFrom('notes')
      .selectAll()
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();

    if (!item) {
      throw new NotFoundError('Note not found');
    }
    const [hydrated] = await this.hydrateTags([item], userId);
    return this.requireHydrated(hydrated);
  }

  async update(input: UpdateNoteInput): Promise<NoteOutput> {
    const validatedInput = UpdateNoteZodSchema.parse(input);

    const updateData: Record<string, any> = {};
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
      updateData.publishing_metadata =
        validatedInput.publishingMetadata === null ? null : validatedInput.publishingMetadata;
    }
    if (validatedInput.analysis !== undefined) {
      updateData.analysis = validatedInput.analysis === null ? null : validatedInput.analysis;
    }

    if (Object.keys(updateData).length === 0 && validatedInput.tags === undefined) {
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    if (Object.keys(updateData).length === 0) {
      await this.syncNoteTags(validatedInput.id, validatedInput.userId, validatedInput.tags ?? []);
      return this.getById(validatedInput.id, validatedInput.userId);
    }
    updateData.updated_at = new Date().toISOString();

    const item = await db
      .updateTable('notes')
      .set(updateData)
      .where('id', '=', validatedInput.id)
      .where('user_id', '=', validatedInput.userId)
      .returningAll()
      .executeTakeFirst();

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
    const item = await db
      .deleteFrom('notes')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

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
    const updateData: Record<string, any> = {
      status: 'published',
      updated_at: now,
    };

    // Handle scheduling
    if (publishData?.scheduledFor) {
      if (existingNote.status !== 'draft') {
        throw new ConflictError(`Cannot schedule note from ${existingNote.status} state`);
      }
      updateData.status = 'draft'; // Keep as draft until scheduled time
      updateData.scheduled_for = publishData.scheduledFor;
    } else {
      assertAllowedTransition(existingNote.status, 'published', 'publish');
      updateData.published_at = now;
    }

    // Build publishing metadata
    if (publishData) {
      const existingMetadata = existingNote.publishingMetadata || {};

      updateData.publishing_metadata = {
        ...existingMetadata,
        ...(publishData.platform && { platform: publishData.platform }),
        ...(publishData.url && { url: publishData.url }),
        ...(publishData.externalId && { externalId: publishData.externalId }),
        ...(publishData.seo && { seo: publishData.seo }),
        ...(publishData.scheduledFor && { scheduledFor: publishData.scheduledFor }),
      } as PublishingMetadata;
    }

    const item = await db
      .updateTable('notes')
      .set(updateData)
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

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

    const item = await db
      .updateTable('notes')
      .set({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

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

    const item = await db
      .updateTable('notes')
      .set({
        status: 'draft',
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

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
    const note = await db
      .selectFrom('notes')
      .selectAll()
      .where('id', '=', noteId)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Determine the root note ID (the one with no parent, or this note's parent)
    const rootNoteId = note.parent_note_id || note.id;

    // Get all versions: the root note and all notes with this root as parent
    const versions = await db
      .selectFrom('notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where((eb) =>
        eb.or([eb('id', '=', rootNoteId), eb('parent_note_id', '=', rootNoteId)]),
      )
      .orderBy('version_number', 'asc')
      .execute();

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

    let query = db
      .selectFrom('notes')
      .selectAll()
      .where('user_id', '=', userId)
      .where('is_latest_version', '=', true);

    // Type filtering
    if (filters?.types && filters.types.length > 0) {
      query = query.where('type', 'in', filters.types);
    }

    // Status filtering
    if (filters?.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }

    // Tag filtering (exact match)
    if (filters?.tags && filters.tags.length > 0) {
      const noteIdsWithTags = await db
        .selectFrom('note_tags')
        .innerJoin('tags', 'tags.id', 'note_tags.tag_id')
        .select('note_tags.note_id')
        .where('tags.owner_id', '=', userId)
        .where('tags.name', 'in', filters.tags)
        .execute();

      if (noteIdsWithTags.length === 0) {
        return { notes: [], total: 0 };
      }

      const tagNoteIds = [...new Set(noteIdsWithTags.map((row) => row.note_id))];
      query = query.where('id', 'in', tagNoteIds);
    }

    // Date filtering
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since);
        query = query.where('updated_at', '>', sinceDate);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    // Full-text search (if query provided)
    if (filters?.query && filters.query.trim() !== '') {
      const searchPattern = `%${filters.query.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('title', 'like', searchPattern),
          eb('content', 'like', searchPattern),
          eb('excerpt', 'like', searchPattern),
        ]),
      );
    }

    // Get total count (without pagination)
    const countResult = await db
      .selectFrom('notes')
      .select(db.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .where('is_latest_version', '=', true)
      .executeTakeFirst();

    const total = Number(countResult?.count ?? 0);

    // Apply ordering and pagination
    const results = await query
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0)
      .execute();

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
    const originalNote = await db
      .selectFrom('notes')
      .selectAll()
      .where('id', '=', noteId)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();

    if (!originalNote) {
      throw new NotFoundError('Note not found');
    }

    // Mark current version as not latest
    await db
      .updateTable('notes')
      .set({ is_latest_version: false })
      .where('id', '=', noteId)
      .execute();

    // Call AI to generate content (placeholder implementation)
    let aiGeneratedContent: string;
    try {
      const prefix = developmentType.toUpperCase();
      aiGeneratedContent = `[${prefix}] ${originalNote.content}`;
    } catch (error) {
      console.error('AI generation error:', error);
      // If AI fails, restore the original note as latest and throw
      await db
        .updateTable('notes')
        .set({ is_latest_version: true })
        .where('id', '=', noteId)
        .execute();
      throw new Error('Failed to generate AI content');
    }

    // Determine the root parent note ID
    const rootParentId = originalNote.parent_note_id || originalNote.id;

    // Calculate the next version number
    const nextVersionNumber = originalNote.version_number + 1;

    // Create new note with AI-generated content
    const newNoteRow = await db
      .insertInto('notes')
      .values({
        user_id: originalNote.user_id,
        type: originalNote.type,
        status: originalNote.status,
        title: originalNote.title,
        content: aiGeneratedContent,
        excerpt: originalNote.excerpt,
        mentions: originalNote.mentions,
        parent_note_id: rootParentId,
        version_number: nextVersionNumber,
        is_latest_version: true,
        analysis: originalNote.analysis,
        publishing_metadata: originalNote.publishing_metadata,
      })
      .returningAll()
      .executeTakeFirst();

    const newNote = this.requireRow(newNoteRow, 'Failed to create developed note');

    // Copy tags from original note
    const originalTags = await db
      .selectFrom('note_tags')
      .select('tag_id')
      .where('note_id', '=', originalNote.id)
      .execute();

    for (const tag of originalTags) {
      try {
        await db
          .insertInto('note_tags')
          .values({
            note_id: newNote.id,
            tag_id: tag.tag_id,
          })
          .execute();
      } catch {
        // Relationship already exists, continue
      }
    }

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
