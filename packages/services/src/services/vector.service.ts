import csv from 'csv-parser'
import { and, desc, eq, sql } from 'drizzle-orm'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import OpenAI from 'openai'
import { db } from '@hominem/db'
import { env } from '../env'
import { type NewVectorDocument, vectorDocuments } from '@hominem/db/schema'

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' })

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  })

  return response.data[0]?.embedding ?? []
}

export async function upsertVectorDocuments(documents: NewVectorDocument[]) {
  if (documents.length === 0) { return }

  await db
    .insert(vectorDocuments)
    .values(documents)
    .onConflictDoUpdate({
      target: vectorDocuments.id,
      set: {
        content: sql`EXCLUDED.content`,
        metadata: sql`EXCLUDED.metadata`,
        embedding: sql`EXCLUDED.embedding`,
        updatedAt: new Date(),
      },
    })
}

export async function queryVectorDocuments(params: {
  embedding: number[]
  source: string
  limit?: number
  userId?: string
}) {
  const { embedding, source, limit = 10, userId } = params
  const conditions = [eq(vectorDocuments.source, source)]
  if (userId) {
    conditions.push(eq(vectorDocuments.userId, userId))
  }

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
    .limit(limit)

  return results
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
      })
    },
  }

  export async function processCSVToVectorStore(
    fileBuffer: Buffer,
    userId: string,
    source: string
  ): Promise<{ recordsProcessed: number }> {
    const records = await parseCSVBuffer(fileBuffer)
    const recordsProcessed = await processRecordsToVectors(records, userId, source)
    return { recordsProcessed }
  }

  async function parseCSVBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, unknown>[] = []
      const readable = Readable.from([buffer])

      readable
        .pipe(csv())
        .on('data', (record: Record<string, unknown>) => records.push(record))
        .on('error', (error: Error) => reject(error))
        .on('end', () => resolve(records))
    })
  }

  async function processRecordsToVectors(
    records: Record<string, unknown>[],
    userId: string,
    source: string
  ): Promise<number> {
    const batchSize = 50
    let totalProcessed = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      const documents = batch.map((record) => {
        const textData = Object.values(record).join(' ')
        return {
          id: (record.id as string) || randomUUID(),
          content: textData,
          metadata: JSON.stringify(record),
        }
      })

      const embeddings = await Promise.all(documents.map((doc) => generateEmbedding(doc.content)))

      const insertData: NewVectorDocument[] = documents.map((doc, index) => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        embedding: embeddings[index],
        userId: userId,
        source: source,
        sourceType: 'csv',
      }))

      await upsertVectorDocuments(insertData)
      totalProcessed += batch.length
    }

    return totalProcessed
  }

  export async function query({
    q,
    source,
    limit = 10,
    userId,
  }: {
    q: string
    source: string
    limit?: number
    userId?: string
  }) {
    const embedding = await generateEmbedding(q)
    const results = await queryVectorDocuments({ embedding, source, limit, userId })

    return {
      results: results.map((row) => ({
        id: row.id,
        document: row.content,
        metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
        source: row.source,
        sourceType: row.sourceType,
      })),
    }
  }

  export async function ingestMarkdown(
    text: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; chunksProcessed: number }> {
    const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
      chunkSize: 256,
      chunkOverlap: 20,
    })

    const splitDocuments = await splitter.createDocuments([text])

    const batchSize = 50
    let totalChunks = 0

    for (let i = 0; i < splitDocuments.length; i += batchSize) {
      const batch = splitDocuments.slice(i, i + batchSize)
      const embeddings = await Promise.all(batch.map((doc) => generateEmbedding(doc.pageContent)))

      const documents: NewVectorDocument[] = batch.map((doc, index) => ({
        id: randomUUID(),
        content: doc.pageContent,
        metadata: JSON.stringify({ ...doc.metadata, ...metadata }),
        embedding: embeddings[index],
        userId: userId,
        source: 'notes',
        sourceType: 'markdown',
      }))

      await db.insert(vectorDocuments).values(documents)
      totalChunks += batch.length
    }

    return { success: true, chunksProcessed: totalChunks }
  }

  export async function searchDocumentsByUser(
    query: string,
    userId: string,
    limit = 10,
    threshold = 0.7
  ) {
    const embedding = await generateEmbedding(query)

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
          sql`1 - (${vectorDocuments.embedding} <=> ${embedding}) >= ${threshold}`
        )
      )
      .orderBy(sql`${vectorDocuments.embedding} <=> ${embedding}`)
      .limit(limit)

    return {
      results: results.map((row) => ({
        id: row.id,
        document: row.content,
        metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
        source: row.source,
        sourceType: row.sourceType,
      })),
    }
  }

  export async function getUserDocuments(userId: string, limit = 50, offset = 0) {
    const results = await db
      .select()
      .from(vectorDocuments)
      .where(eq(vectorDocuments.userId, userId))
      .orderBy(desc(vectorDocuments.createdAt))
      .limit(limit)
      .offset(offset)

    return results
  }

  export async function deleteUserDocuments(userId: string, source?: string) {
    const conditions = [eq(vectorDocuments.userId, userId)]

    if (source) {
      conditions.push(eq(vectorDocuments.source, source))
    }

    await db.delete(vectorDocuments).where(and(...conditions))

    return { success: true }
  }
}
