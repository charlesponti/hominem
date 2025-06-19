import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { vectorDocuments, type NewVectorDocument } from '@hominem/utils/schema'
import { tool } from 'ai'
import csv from 'csv-parser'
import { and, desc, eq, sql } from 'drizzle-orm'
import crypto, { createHash } from 'node:crypto'
import fs from 'node:fs'
import z from 'zod'
import { openaiClient } from '../lib/openai'

// OpenAI embeddings function using the proper client
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      input: text,
      model: 'text-embedding-3-small',
    })

    return response.data[0].embedding
  } catch (error) {
    logger.error('Error generating embedding:', error)
    throw error
  }
}

export namespace HominemVectorStore {
  // Create a custom tool for search
  export const searchDocumentsTool = tool({
    parameters: z.object({ query: z.string() }),
    description: 'Search the database for information',
    execute: async ({ query }: { query: string }) => {
      return await HominemVectorStore.searchDocuments(query)
    },
  })

  export async function getDocumentCollection(indexName: string) {
    // The vector_documents table is already defined in the schema
    // No need to create it manually
    return { name: indexName }
  }

  export async function upsertProfile(id: string, profile: string) {
    const embedding = await generateEmbedding(profile)

    await db
      .insert(vectorDocuments)
      .values({
        id,
        content: profile,
        metadata: JSON.stringify({ id }),
        embedding: embedding,
        source: 'profile',
        sourceType: 'manual',
      })
      .onConflictDoUpdate({
        target: vectorDocuments.id,
        set: {
          content: profile,
          metadata: JSON.stringify({ id }),
          embedding: embedding,
          updatedAt: new Date(),
        },
      })

    return { count: 1 }
  }

  export async function upsertBatch(
    indexName: string,
    documents: Array<{ id: string; document: string; metadata?: Record<string, string | number> }>
  ) {
    try {
      // Process documents in batches to avoid overwhelming the embedding API
      const batchSize = 10
      let totalCount = 0

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize)

        // Generate embeddings for the batch
        const embeddings = await Promise.all(batch.map((doc) => generateEmbedding(doc.document)))

        // Insert batch into database using Drizzle
        const insertData: NewVectorDocument[] = batch.map((doc, j) => ({
          id: doc.id,
          content: doc.document,
          metadata: JSON.stringify(doc.metadata || {}),
          embedding: embeddings[j],
          source: indexName,
          sourceType: 'batch',
        }))

        await db
          .insert(vectorDocuments)
          .values(insertData)
          .onConflictDoUpdate({
            target: vectorDocuments.id,
            set: {
              content: sql`EXCLUDED.content`,
              metadata: sql`EXCLUDED.metadata`,
              embedding: sql`EXCLUDED.embedding`,
              updatedAt: new Date(),
            },
          })

        totalCount += batch.length
        logger.info(`Processed ${totalCount}/${documents.length} documents for ${indexName}`)
      }

      return { count: documents.length }
    } catch (error) {
      logger.error(error)
      throw new Error(`Failed to upsert batch: ${(error as Error)?.message}`)
    }
  }

  export async function query({
    q,
    indexName,
    limit,
  }: {
    q: string
    indexName: string
    limit: number
  }) {
    const queryEmbedding = await generateEmbedding(q)

    const results = await db
      .select({
        id: vectorDocuments.id,
        document: vectorDocuments.content,
        metadata: vectorDocuments.metadata,
        score: sql<number>`1 - (${vectorDocuments.embedding} <=> ${queryEmbedding})`,
      })
      .from(vectorDocuments)
      .where(eq(vectorDocuments.source, indexName))
      .orderBy(sql`${vectorDocuments.embedding} <=> ${queryEmbedding}`)
      .limit(limit)

    return {
      results: results.map((row) => ({
        id: row.id,
        score: row.score,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        document: row.document,
      })),
    }
  }

  export async function getImageEmbedding(image: File): Promise<number[][]> {
    try {
      const arrayBuffer = await image.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      const embedding = await generateEmbedding(base64)
      return [embedding]
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  export async function getEmbeddingsFromImage(imagePath: string): Promise<number[][]> {
    try {
      const imageBuffer = fs.readFileSync(imagePath)
      const base64 = imageBuffer.toString('base64')
      const embedding = await generateEmbedding(base64)
      return [embedding]
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  export async function embedFromBuffer(buffer: Buffer): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const base64 = buffer.toString('base64')

      await HominemVectorStore.upsertBatch('images', [
        {
          id: createHash('md5').update(base64).digest('hex'),
          document: base64,
          metadata: {},
        },
      ])

      return { success: true, message: 'Image embedded successfully' }
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  export async function uploadCSVToVectorStore(
    filePath: string,
    indexName: string
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const records: Record<string, any>[] = []

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (record) => records.push(record))
        .on('error', (error) => reject(error))
        .on('end', async () => {
          try {
            const batchSize = 100
            let processedCount = 0

            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize)
              const documents = batch.map((record) => {
                const textData = Object.values(record).join(' ')
                processedCount++
                return {
                  id: record.id || crypto.randomUUID(),
                  document: textData,
                  metadata: record,
                }
              })

              await HominemVectorStore.upsertBatch(indexName, documents)
            }

            resolve(records.length)
          } catch (error) {
            reject(error)
          }
        })
    })
  }

  // Define types for document search results
  export interface DocumentSearchResult {
    content: string
    metadata: Record<string, string>
  }

  export interface DocumentSearchResponse {
    data: DocumentSearchResult[]
  }

  /**
   * Search documents using embeddings
   */
  export const searchDocuments = async (
    query: string
  ): Promise<Awaited<ReturnType<typeof HominemVectorStore.query>>> => {
    const response = await HominemVectorStore.query({
      q: query,
      indexName: 'documents',
      limit: 5,
    })

    return response
  }

  /**
   * Search documents by user ID with vector similarity
   */
  export async function searchDocumentsByUser(
    query: string,
    userId: string,
    limit = 10,
    threshold = 0.7
  ) {
    const queryEmbedding = await generateEmbedding(query)

    const results = await db
      .select({
        id: vectorDocuments.id,
        content: vectorDocuments.content,
        metadata: vectorDocuments.metadata,
        title: vectorDocuments.title,
        source: vectorDocuments.source,
        sourceType: vectorDocuments.sourceType,
        similarity: sql<number>`1 - (${vectorDocuments.embedding} <=> ${queryEmbedding})`,
      })
      .from(vectorDocuments)
      .where(
        and(
          eq(vectorDocuments.userId, userId),
          sql`1 - (${vectorDocuments.embedding} <=> ${queryEmbedding}) >= ${threshold}`
        )
      )
      .orderBy(sql`${vectorDocuments.embedding} <=> ${queryEmbedding}`)
      .limit(limit)

    return {
      results: results.map((row) => ({
        id: row.id,
        score: row.similarity,
        document: row.content,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        title: row.title || undefined,
        source: row.source || undefined,
        sourceType: row.sourceType || undefined,
      })),
    }
  }

  /**
   * Get documents by user ID
   */
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
}
