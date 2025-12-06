import { randomUUID } from 'node:crypto'
import { db } from '@hominem/data'
import { type NewVectorDocument, vectorDocuments } from '@hominem/data/schema'
import { logger } from '@hominem/utils/logger'
import csv from 'csv-parser'
import { and, desc, eq, sql } from 'drizzle-orm'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { openaiClient } from '../lib/openai.js'

// OpenAI embeddings function using the existing client
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      input: text,
      model: 'text-embedding-3-small',
    })

    return response.data[0].embedding
  } catch (error) {
    logger.error('Error generating embedding:', { error })
    throw error
  }
}

// Vector service focused only on vector operations
export namespace VectorService {
  // Create a custom tool for search
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

  /**
   * Process CSV records into vectors (assumes file has already been uploaded elsewhere)
   */
  export async function processCSVToVectorStore(
    fileBuffer: Buffer,
    userId: string,
    source: string
  ): Promise<{ recordsProcessed: number }> {
    try {
      // Process CSV content
      const records = await parseCSVBuffer(fileBuffer)
      const recordsProcessed = await processRecordsToVectors(records, userId, source)

      return { recordsProcessed }
    } catch (error) {
      logger.error('CSV processing error:', { error })
      throw error
    }
  }

  /**
   * Parse CSV buffer into records
   */
  async function parseCSVBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, unknown>[] = []
      const stream = require('node:stream')
      const readable = new stream.Readable()
      readable.push(buffer)
      readable.push(null)

      readable
        .pipe(csv())
        .on('data', (record: Record<string, unknown>) => records.push(record))
        .on('error', (error: Error) => reject(error))
        .on('end', () => resolve(records))
    })
  }

  /**
   * Process records and insert into database using Drizzle
   */
  async function processRecordsToVectors(
    records: Record<string, unknown>[],
    userId: string,
    source: string
  ): Promise<number> {
    const batchSize = 50
    let totalProcessed = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)

      // Prepare documents for embedding
      const documents = batch.map((record) => {
        const textData = Object.values(record).join(' ')
        return {
          id: (record.id as string) || randomUUID(),
          content: textData,
          metadata: JSON.stringify(record),
        }
      })

      // Generate embeddings for the batch using OpenAI
      const embeddings = await Promise.all(documents.map((doc) => generateEmbedding(doc.content)))

      // Prepare data for Drizzle insertion
      const insertData: NewVectorDocument[] = documents.map((doc, index) => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        embedding: embeddings[index],
        userId: userId,
        source: source,
        sourceType: 'csv',
      }))

      // Insert into database using Drizzle
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

      totalProcessed += batch.length
      logger.info(`Processed ${totalProcessed}/${records.length} records for ${source}`)
    }

    return totalProcessed
  }

  /**
   * Query vector store using Drizzle with pgvector
   */
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
    try {
      // Generate embedding for the query using OpenAI
      const embedding = await generateEmbedding(q)

      // Build query conditions
      const conditions = [eq(vectorDocuments.source, source)]

      // Add user filter if provided
      if (userId) {
        conditions.push(eq(vectorDocuments.userId, userId))
      }

      // Query using vector similarity with Drizzle
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

      return {
        results: results.map((row) => ({
          id: row.id,
          document: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          source: row.source,
          sourceType: row.sourceType,
        })),
      }
    } catch (error) {
      logger.error('Vector query error:', { error })
      throw error
    }
  }

  /**
   * Ingest markdown text into vector store
   */
  export async function ingestMarkdown(
    text: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; chunksProcessed: number }> {
    try {
      const splitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
        chunkSize: 256,
        chunkOverlap: 20,
      })

      const splitDocuments = await splitter.createDocuments([text])

      // Process chunks in batches
      const batchSize = 50
      let totalChunks = 0

      for (let i = 0; i < splitDocuments.length; i += batchSize) {
        const batch = splitDocuments.slice(i, i + batchSize)

        // Generate embeddings for the batch using OpenAI
        const embeddings = await Promise.all(batch.map((doc) => generateEmbedding(doc.pageContent)))

        // Prepare documents for insertion using Drizzle
        const documents: NewVectorDocument[] = batch.map((doc, index) => ({
          id: randomUUID(),
          content: doc.pageContent,
          metadata: JSON.stringify({ ...doc.metadata, ...metadata }),
          embedding: embeddings[index],
          userId: userId,
          source: 'notes',
          sourceType: 'markdown',
        }))

        // Insert into database using Drizzle
        await db.insert(vectorDocuments).values(documents)

        totalChunks += batch.length
      }

      return { success: true, chunksProcessed: totalChunks }
    } catch (error) {
      logger.error('Markdown ingestion error:', { error })
      throw error
    }
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
    try {
      // Generate embedding for the query using OpenAI
      const embedding = await generateEmbedding(query)

      // Query with similarity threshold using Drizzle
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
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          source: row.source,
          sourceType: row.sourceType,
        })),
      }
    } catch (error) {
      logger.error('User document search error:', { error })
      throw error
    }
  }

  /**
   * Get documents by user ID using Drizzle
   */
  export async function getUserDocuments(userId: string, limit = 50, offset = 0) {
    try {
      const results = await db
        .select()
        .from(vectorDocuments)
        .where(eq(vectorDocuments.userId, userId))
        .orderBy(desc(vectorDocuments.createdAt))
        .limit(limit)
        .offset(offset)

      return results
    } catch (error) {
      logger.error('Get user documents error:', { error })
      throw error
    }
  }

  /**
   * Delete documents by user ID and source using Drizzle
   */
  export async function deleteUserDocuments(userId: string, source?: string) {
    try {
      const conditions = [eq(vectorDocuments.userId, userId)]

      if (source) {
        conditions.push(eq(vectorDocuments.source, source))
      }

      await db.delete(vectorDocuments).where(and(...conditions))

      return { success: true }
    } catch (error) {
      logger.error('Delete user documents error:', { error })
      throw error
    }
  }
}
