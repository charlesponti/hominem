import { db } from '@hominem/db';
import { type Content, type ContentInsert, content } from '@hominem/db/schema';
import { and, desc, eq, or, type SQLWrapper, sql } from 'drizzle-orm';

// Import shared error classes from notes service
import { ForbiddenError, NotFoundError } from './notes.service';

export class ContentService {
  async create(input: ContentInsert): Promise<Content> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create content');
    }

    const now = new Date().toISOString();
    const contentData: ContentInsert = {
      ...input,
      tags: input.tags === null ? [] : input.tags || [],
      socialMediaMetadata:
        input.socialMediaMetadata === null ? undefined : input.socialMediaMetadata,
      seoMetadata: input.seoMetadata === null ? undefined : input.seoMetadata,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    };

    const [item] = await db.insert(content).values(contentData).returning();
    if (!item) {
      throw new Error('Failed to create content: No content returned from database');
    }
    return item as Content;
  }

  async list(
    userId: string,
    filters?: {
      types?: Content['type'][];
      status?: Content['status'][];
      query?: string;
      tags?: string[];
      since?: string;
    },
  ): Promise<Content[]> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to list content');
    }

    const conditions: SQLWrapper[] = [eq(content.userId, userId)];

    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = [];
      for (const type of filters.types) {
        typeFilters.push(sql`${content.type} = ${type}`);
      }
      conditions.push(or(...typeFilters) as SQLWrapper);
    }

    if (filters?.status && filters.status.length > 0) {
      const statusFilters: SQLWrapper[] = [];
      for (const status of filters.status) {
        statusFilters.push(sql`${content.status} = ${status}`);
      }
      conditions.push(or(...statusFilters) as SQLWrapper);
    }

    // Full-Text Search logic
    let ftsQuery = '';
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim();
    }

    // Define the tsvector construction SQL
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${content.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${content.content}), 'B') ||
      setweight(to_tsvector('english', coalesce(${content.excerpt}, '')), 'C') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${content.tags}) AS tag_item), '')), 'D')
    )`;

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`);
    }

    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`${content.tags}::jsonb @> ${JSON.stringify([{ value: tag }])}::jsonb`);
      }
    }

    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString();
        conditions.push(sql`${content.updatedAt} > ${sinceDate}`);
      } catch {
        console.warn(`Invalid 'since' date format: ${filters.since}`);
      }
    }

    const baseQuery = db
      .select()
      .from(content)
      .where(and(...conditions.filter((c) => !!c)));

    // biome-ignore lint/suspicious/noImplicitAnyLet: Query type is complex and inferred correctly
    let orderedQuery;
    if (ftsQuery) {
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(content.updatedAt),
      );
    } else {
      orderedQuery = baseQuery.orderBy(desc(content.updatedAt));
    }

    const result = await orderedQuery;
    return result as Content[];
  }

  async getById(id: string, userId: string): Promise<Content> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve content');
    }

    const [item] = await db
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.userId, userId)))
      .limit(1);

    if (!item) {
      throw new NotFoundError('Content not found');
    }
    return item as Content;
  }

  async update(input: Partial<Content> & { id: string; userId: string }) {
    const updateData = {
      ...input,
      tags: input.tags === null ? [] : input.tags || [],
      socialMediaMetadata:
        input.socialMediaMetadata === null ? undefined : input.socialMediaMetadata,
      seoMetadata: input.seoMetadata === null ? undefined : input.seoMetadata,
      updatedAt: new Date().toISOString(),
    };

    const [item] = await db
      .update(content)
      .set(updateData)
      .where(and(eq(content.id, input.id), eq(content.userId, input.userId)))
      .returning();

    return item;
  }

  async delete(id: string, userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete content');
    }

    await db.delete(content).where(and(eq(content.id, id), eq(content.userId, userId)));
  }

  async publish(
    id: string,
    userId: string,
    publishData?: {
      scheduledFor?: string;
      socialMediaMetadata?: unknown;
    },
  ): Promise<Content> {
    const updateData: Partial<typeof content.$inferInsert> = {
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (publishData?.scheduledFor) {
      updateData.status = 'scheduled';
      updateData.scheduledFor = publishData.scheduledFor;
      updateData.publishedAt = undefined;
    }

    if (publishData?.socialMediaMetadata) {
      updateData.socialMediaMetadata = publishData.socialMediaMetadata;
    }

    const [item] = await db
      .update(content)
      .set(updateData)
      .where(and(eq(content.id, id), eq(content.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Content not found or not authorized to publish');
    }
    return item as Content;
  }

  async archive(id: string, userId: string): Promise<Content> {
    const [item] = await db
      .update(content)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(content.id, id), eq(content.userId, userId)))
      .returning();

    if (!item) {
      throw new NotFoundError('Content not found or not authorized to archive');
    }
    return item as Content;
  }
}
