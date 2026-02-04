import type { VectorDocumentInput, VectorDocumentOutput } from '@hominem/db/types/vector-documents';

import { vectorDocuments } from '@hominem/db/schema/vector-documents';
import { splitMarkdown, type Document } from '@hominem/utils/markdown';
import csv from 'csv-parser';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import OpenAI from 'openai';

import { env } from './env';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });

  return response.data[0]?.embedding ?? [];
}

export async function upsertVectorDocuments(documents: VectorDocumentInput[]): Promise<void> {
  if (documents.length === 0) {
    return;
  }

  const { db } = await import('@hominem/db');
  await db
    .insert(vectorDocuments)
    .values(documents)
    .onConflictDoUpdate({
      target: vectorDocuments.id,
      set: {
        content: sql`EXCLUDED.content`,
        metadata: sql`EXCLUDED.metadata`,
        embedding: sql`EXCLUDED.embedding`,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function queryVectorDocuments(params: {
  embedding: number[];
  source: string;
  limit?: number;
  userId?: string;
}): Promise<
  Array<{
    id: string;
    content: string;
    metadata: string | null;
    source: string | null;
    sourceType: string | null;
    score: number;
  }>
> {
  const { embedding, source, limit = 10, userId } = params;
  const conditions = [eq(vectorDocuments.source, source)];
  if (userId) {
    conditions.push(eq(vectorDocuments.userId, userId));
  }

  const { db } = await import('@hominem/db');
  const results = await db
    .select({
      id: vectorDocuments.id,
      content: vectorDocuments.content,
      metadata: vectorDocuments.metadata,
      source: vectorDocuments.source,
      sourceType: vectorDocuments.sourceType,
      score: sql<number>`1 - (${vectorDocuments.embedding} <=> ${embedding})`,
    })
    .from(vectorDocuments)
    .where(and(...conditions))
    .orderBy(sql`${vectorDocuments.embedding} <=> ${embedding}`)
    .limit(limit);

  return results;
}

export namespace VectorService {
  export const searchDocumentsTool = {
    parameters: { query: 'string' },
    description: 'Search the database for information using vector similarity',
    execute: async ({ query }: { query: string }) => {
      return await VectorService.query({
        q: query,
        source: 'documents',
        limit: 5,
      });
    },
  };

  export async function processCSVToVectorStore(
    fileBuffer: Buffer,
    userId: string,
    source: string,
  ): Promise<{ recordsProcessed: number }> {
    const records = await parseCSVBuffer(fileBuffer);
    const recordsProcessed = await processRecordsToVectors(records, userId, source);
    return { recordsProcessed };
  }

  async function parseCSVBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, unknown>[] = [];
      const readable = Readable.from([buffer]);

      readable
        .pipe(csv())
        .on('data', (record: Record<string, unknown>) => records.push(record))
        .on('error', (error: Error) => reject(error))
        .on('end', () => resolve(records));
    });
  }

   async function processRecordsToVectors(
     records: Record<string, unknown>[],
     userId: string,
     source: string,
   ): Promise<number> {
     const batchSize = 50;
     let totalProcessed = 0;

     for (let i = 0; i < records.length; i += batchSize) {
       const batch = records.slice(i, i + batchSize);

       const documents = batch.map((record) => {
         const textData = Object.values(record).join(' ');
         return {
           id: (record.id as string) || randomUUID(),
           content: textData,
           metadata: JSON.stringify(record),
         };
       });

       const embeddings = await Promise.all(documents.map((doc) => generateEmbedding(doc.content)));
       const now = new Date().toISOString();

       const insertData: VectorDocumentInput[] = documents.map((doc, index) => ({
         id: doc.id,
         content: doc.content,
         metadata: doc.metadata,
         embedding: embeddings[index],
         userId: userId,
         source: source,
         sourceType: 'csv',
         createdAt: now,
         updatedAt: now,
       }));

       await upsertVectorDocuments(insertData);
       totalProcessed += batch.length;
     }

     return totalProcessed;
   }

  export async function query({
    q,
    source,
    limit = 10,
    userId,
  }: {
    q: string;
    source: string;
    limit?: number;
    userId?: string;
  }): Promise<{
    results: Array<{
      id: string;
      document: string;
      metadata: any;
      source: string | null;
      sourceType: string | null;
    }>;
  }> {
    const embedding = await generateEmbedding(q);
    const queryParams = { embedding, source, limit } as const;
    const results = await queryVectorDocuments(userId ? { ...queryParams, userId } : queryParams);

    return {
      results: results.map((row) => ({
        id: row.id,
        document: row.content,
        metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
        source: row.source,
        sourceType: row.sourceType,
      })),
    };
  }

   export async function ingestMarkdown(
     text: string,
     userId: string,
     metadata?: Record<string, unknown>,
   ): Promise<{ success: boolean; chunksProcessed: number }> {
     const splitDocuments = await splitMarkdown(text, {
       chunkSize: 256,
       chunkOverlap: 20,
     });

     const batchSize = 50;
     let totalChunks = 0;

     for (let i = 0; i < splitDocuments.length; i += batchSize) {
       const batch = splitDocuments.slice(i, i + batchSize);
       const embeddings = await Promise.all(
         batch.map((doc: Document) => generateEmbedding(doc.pageContent)),
       );
       const now = new Date().toISOString();

       const documents: VectorDocumentInput[] = batch.map((doc: Document, index: number) => ({
         id: randomUUID(),
         content: doc.pageContent,
         metadata: JSON.stringify({ ...doc.metadata, ...metadata }),
         embedding: embeddings[index],
         userId: userId,
         source: 'notes',
         sourceType: 'markdown',
         createdAt: now,
         updatedAt: now,
       }));

       const { db } = await import('@hominem/db');
       await db.insert(vectorDocuments).values(documents);
       totalChunks += batch.length;
     }

     return { success: true, chunksProcessed: totalChunks };
   }

  export async function searchDocumentsByUser(
    query: string,
    userId: string,
    limit = 10,
    threshold = 0.7,
  ): Promise<{
    results: Array<{
      id: string;
      document: string;
      metadata: any;
      source: string | null;
      sourceType: string | null;
      similarity: number;
    }>;
  }> {
    const embedding = await generateEmbedding(query);

    const { db } = await import('@hominem/db');
    const results = await db
      .select({
        id: vectorDocuments.id,
        content: vectorDocuments.content,
        metadata: vectorDocuments.metadata,
        source: vectorDocuments.source,
        sourceType: vectorDocuments.sourceType,
        similarity: sql<number>`1 - (${vectorDocuments.embedding} <=> ${embedding})`,
      })
      .from(vectorDocuments)
      .where(
        and(
          eq(vectorDocuments.userId, userId),
          sql`1 - (${vectorDocuments.embedding} <=> ${embedding}) >= ${threshold}`,
        ),
      )
      .orderBy(sql`${vectorDocuments.embedding} <=> ${embedding}`)
      .limit(limit);

    return {
      results: results.map((row) => ({
        id: row.id,
        document: row.content,
        metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
        source: row.source,
        sourceType: row.sourceType,
        similarity: row.similarity,
      })),
    };
  }

  export async function getUserDocuments(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<VectorDocumentOutput[]> {
    const { db } = await import('@hominem/db');
    const results = await db
      .select()
      .from(vectorDocuments)
      .where(eq(vectorDocuments.userId, userId))
      .orderBy(desc(vectorDocuments.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  export async function deleteUserDocuments(userId: string, source?: string) {
    const conditions = [eq(vectorDocuments.userId, userId)];

    if (source) {
      conditions.push(eq(vectorDocuments.source, source));
    }

    const { db } = await import('@hominem/db');
    await db.delete(vectorDocuments).where(and(...conditions));

    return { success: true };
  }
}
