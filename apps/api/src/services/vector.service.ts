import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { vectorDocuments, type NewVectorDocument } from '@hominem/utils/schema'
import csv from 'csv-parser'
import { and, desc, eq, sql } from 'drizzle-orm'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { randomUUID } from 'node:crypto'
import { openaiClient } from '../lib/openai.js'
import { supabaseClient } from '../middleware/supabase.js'

// OpenAI embeddings function using the existing client
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

// Supabase vector service using Drizzle ORM and Supabase Storage
export namespace SupabaseVectorService {
  // Create a custom tool for search
  export const searchDocumentsTool = {
    parameters: { query: 'string' },
    description: 'Search the database for information using vector similarity',
    execute: async ({ query }: { query: string }) => {
      return await SupabaseVectorService.searchDocuments(query)
    },
  }

  /**
   * Search documents using embeddings
   */
  export const searchDocuments = async (query: string) => {
    const response = await SupabaseVectorService.query({
      q: query,
      indexName: 'documents',
      limit: 5,
    })

    return response
  }

  /**
   * Upload CSV file to Supabase storage and process into vectors
   */
  export async function uploadCSVToVectorStore(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    indexName: string
  ): Promise<{ recordsProcessed: number; filePath: string }> {
    try {
      // Upload file to Supabase storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${userId}/${indexName}/${timestamp}_${sanitizedFileName}`

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('vector-files')
        .upload(filePath, fileBuffer, {
          contentType: 'text/csv',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }

      // Process CSV content
      const records = await parseCSVBuffer(fileBuffer)
      const recordsProcessed = await processRecordsToVectors(records, userId, indexName)

      return { recordsProcessed, filePath: uploadData.path }
    } catch (error) {
      logger.error('CSV upload error:', error)
      throw error
    }
  }

  /**
   * Parse CSV buffer into records
   */
  async function parseCSVBuffer(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const records: Record<string, unknown>[] = []
      const stream = require('stream')
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
    indexName: string
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
        source: indexName,
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
      logger.info(`Processed ${totalProcessed}/${records.length} records for ${indexName}`)
    }

    return totalProcessed
  }

  /**
   * Query vector store using Drizzle with pgvector
   */
  export async function query({
    q,
    indexName,
    limit = 10,
    userId,
  }: {
    q: string
    indexName: string
    limit?: number
    userId?: string
  }) {
    try {
      // Generate embedding for the query using OpenAI
      const embedding = await generateEmbedding(q)

      // Build query conditions
      const conditions = [eq(vectorDocuments.source, indexName)]

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
      logger.error('Vector query error:', error)
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
      logger.error('Markdown ingestion error:', error)
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
      logger.error('User document search error:', error)
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
      logger.error('Get user documents error:', error)
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
      logger.error('Delete user documents error:', error)
      throw error
    }
  }

  /**
   * Get file list from Supabase storage
   */
  export async function getUserFiles(userId: string, indexName?: string): Promise<unknown[]> {
    try {
      let path = userId
      if (indexName) {
        path = `${userId}/${indexName}`
      }

      const { data: files, error } = await supabaseClient.storage.from('vector-files').list(path)

      if (error) {
        throw new Error(`Failed to list user files: ${error.message}`)
      }

      return files || []
    } catch (error) {
      logger.error('Get user files error:', error)
      throw error
    }
  }

  /**
   * Delete file from Supabase storage
   */
  export async function deleteUserFile(filePath: string) {
    try {
      const { error } = await supabaseClient.storage.from('vector-files').remove([filePath])

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      logger.error('Delete user file error:', error)
      throw error
    }
  }
}
