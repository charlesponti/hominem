import { sql, type Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppVectorDocuments, Json } from '../../types/database';

type VectorDocumentRow = Selectable<AppVectorDocuments>;

export type VectorDocumentEntityType = 'note' | 'chat';

export interface VectorDocumentRecord {
  id: string;
  ownerUserId: string;
  entityType: VectorDocumentEntityType;
  entityId: string;
  content: string;
  metadata: Json | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertVectorDocumentInput {
  ownerUserId: string;
  entityType: VectorDocumentEntityType;
  entityId: string;
  content: string;
  embedding: number[];
  metadata?: Json | null;
}

export interface SearchVectorDocumentsInput {
  userId: string;
  embedding: number[];
  entityType?: VectorDocumentEntityType;
  limit?: number;
  threshold?: number;
}

export interface VectorDocumentSearchResult extends VectorDocumentRecord {
  similarity: number;
}

function toVectorDocumentRecord(row: VectorDocumentRow): VectorDocumentRecord {
  return {
    id: row.id,
    ownerUserId: row.ownerUserid,
    entityType: row.entityType as VectorDocumentEntityType,
    entityId: row.entityId,
    content: row.content,
    metadata: row.metadata,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export const VectorDocumentRepository = {
  async upsert(handle: DbHandle, input: UpsertVectorDocumentInput): Promise<VectorDocumentRecord> {
    const vectorLiteral = toVectorLiteral(input.embedding);
    const metadata = input.metadata ?? null;

    const row = await handle
      .insertInto('app.vectorDocuments')
      .values({
        ownerUserid: input.ownerUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        content: input.content,
        embedding: sql`${vectorLiteral}::vector`,
        metadata,
      })
      .onConflict((oc) =>
        oc.columns(['entityType', 'entityId']).doUpdateSet({
          content: input.content,
          embedding: sql`${vectorLiteral}::vector`,
          metadata,
          updatedat: new Date(),
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return toVectorDocumentRecord(row);
  },

  async deleteForEntity(
    handle: DbHandle,
    entityType: VectorDocumentEntityType,
    entityId: string,
  ): Promise<void> {
    await handle
      .deleteFrom('app.vectorDocuments')
      .where('entityType', '=', entityType)
      .where('entityId', '=', entityId)
      .execute();
  },

  // Orders by ascending distance rather than descending similarity so the HNSW index can be used
  async search(
    handle: DbHandle,
    input: SearchVectorDocumentsInput,
  ): Promise<VectorDocumentSearchResult[]> {
    const vectorLiteral = toVectorLiteral(input.embedding);
    const limit = input.limit ?? 10;

    let query = handle
      .selectFrom('app.vectorDocuments')
      .selectAll()
      .select(sql<number>`1 - (embedding <=> ${vectorLiteral}::vector)`.as('similarity'))
      .where('ownerUserid', '=', input.userId);

    if (input.entityType) {
      query = query.where('entityType', '=', input.entityType);
    }

    if (input.threshold !== undefined) {
      query = query.where(
        sql<boolean>`1 - (embedding <=> ${vectorLiteral}::vector) >= ${input.threshold}`,
      );
    }

    const rows = await query
      .orderBy(sql`embedding <=> ${vectorLiteral}::vector`)
      .limit(limit)
      .execute();

    return rows.map((row) => ({
      ...toVectorDocumentRecord(row),
      similarity: row.similarity,
    }));
  },
};
