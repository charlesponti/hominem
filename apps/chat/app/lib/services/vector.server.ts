import { db } from '@hominem/utils/db'
import { vectorDocuments, type NewVectorDocument, type VectorDocument } from '@hominem/utils/schema'
import { tool } from 'ai'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { openai } from './openai.server'

// Define types for document search results
export interface DocumentSearchResult {
  id: string
  score: number
  metadata: Record<string, string | number>
  document: string
  title?: string
  source?: string
  sourceType?: string
}

export interface DocumentSearchResponse {
  results: DocumentSearchResult[]
}

const SearchToolSchema = z.object({
  query: z.string().describe('The search query'),
  userId: z.string().optional().describe('The user ID to filter documents'),
  limit: z.number().optional().default(10).describe('Maximum number of results to return'),
  threshold: z.number().optional().default(0.7).describe('Similarity threshold (0-1)'),
})

export namespace HominemVectorStore {
  // Create a custom tool for search
  export const searchDocumentsTool = tool({
    description: 'Search the vector database for relevant information',
    parameters: SearchToolSchema,
    execute: async ({
      query,
      userId,
      limit = 10,
      threshold = 0.7,
    }: z.infer<typeof SearchToolSchema>) => {
      return await HominemVectorStore.searchDocuments(query, userId, limit, threshold)
    },
  })

  /**
   * Generate embeddings for text using OpenAI
   */
  const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' '), // Clean up newlines
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Chunk large text into smaller segments for better embedding
   */
  const chunkText = (text: string, maxChunkSize = 1500, overlap = 200): string[] => {
    if (text.length <= maxChunkSize) {
      return [text]
    }

    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length)
      let chunk = text.slice(start, end)

      // Try to break at a sentence or word boundary
      if (end < text.length) {
        const lastSentence = chunk.lastIndexOf('.')
        const lastSpace = chunk.lastIndexOf(' ')

        if (lastSentence > maxChunkSize * 0.8) {
          chunk = chunk.slice(0, lastSentence + 1)
        } else if (lastSpace > maxChunkSize * 0.8) {
          chunk = chunk.slice(0, lastSpace)
        }
      }

      chunks.push(chunk.trim())
      start = start + chunk.length - overlap
    }

    return chunks.filter((chunk) => chunk.length > 50) // Filter out very small chunks
  }

  /**
   * Search documents using vector similarity with pgvector
   */
  export const searchDocuments = async (
    query: string,
    userId?: string,
    limit = 10,
    threshold = 0.7
  ): Promise<DocumentSearchResponse> => {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query)

      // Build the vector similarity search query
      const results = await db
        .select({
          id: vectorDocuments.id,
          content: vectorDocuments.content,
          metadata: vectorDocuments.metadata,
          title: vectorDocuments.title,
          source: vectorDocuments.source,
          sourceType: vectorDocuments.sourceType,
          similarity: sql<number>`1 - (${vectorDocuments.embedding} <=> ${queryEmbedding}::vector)`,
        })
        .from(vectorDocuments)
        .where(
          and(
            userId ? eq(vectorDocuments.userId, userId) : sql`true`,
            sql`1 - (${vectorDocuments.embedding} <=> ${queryEmbedding}::vector) >= ${threshold}`
          )
        )
        .orderBy(sql`${vectorDocuments.embedding} <=> ${queryEmbedding}::vector`)
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
    } catch (error) {
      console.error('Vector search error:', error)
      return { results: [] }
    }
  }

  /**
   * Add a document to the vector store with embedding
   */
  export async function addDocument(
    content: string,
    userId: string,
    metadata: Record<string, string | number> = {},
    options: {
      title?: string
      source?: string
      sourceType?: string
    } = {}
  ): Promise<{ success: boolean; id: string }> {
    try {
      // Generate embedding for the content
      const embedding = await generateEmbedding(content)

      // Prepare the document data
      const documentData: NewVectorDocument = {
        content,
        userId,
        metadata: JSON.stringify(metadata),
        embedding: embedding,
        title: options.title,
        source: options.source,
        sourceType: options.sourceType,
      }

      // Insert the document into the database
      const result = await db
        .insert(vectorDocuments)
        .values(documentData)
        .returning({ id: vectorDocuments.id })

      return {
        success: true,
        id: result[0].id,
      }
    } catch (error) {
      console.error('Error adding document to vector store:', error)
      return {
        success: false,
        id: '',
      }
    }
  }

  /**
   * Add a large document by chunking it into smaller pieces
   */
  export async function addDocumentWithChunking(
    content: string,
    userId: string,
    metadata: Record<string, string | number> = {},
    options: {
      title?: string
      source?: string
      sourceType?: string
      maxChunkSize?: number
      overlap?: number
    } = {}
  ): Promise<{ success: boolean; ids: string[] }> {
    try {
      const { maxChunkSize = 1500, overlap = 200, ...docOptions } = options
      const chunks = chunkText(content, maxChunkSize, overlap)
      const ids: string[] = []

      // Add each chunk as a separate document
      for (let i = 0; i < chunks.length; i++) {
        const chunkMetadata = {
          ...metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          isChunk: 1, // Use 1 instead of true for the boolean value
        }

        const result = await addDocument(chunks[i], userId, chunkMetadata, {
          ...docOptions,
          title: docOptions.title ? `${docOptions.title} (Part ${i + 1})` : undefined,
        })

        if (result.success) {
          ids.push(result.id)
        }
      }

      return {
        success: ids.length > 0,
        ids,
      }
    } catch (error) {
      console.error('Error adding chunked document:', error)
      return {
        success: false,
        ids: [],
      }
    }
  }

  /**
   * Update an existing document's content and regenerate embedding
   */
  export async function updateDocument(
    id: string,
    content: string,
    userId: string,
    metadata: Record<string, string | number> = {},
    options: {
      title?: string
      source?: string
      sourceType?: string
    } = {}
  ): Promise<{ success: boolean }> {
    try {
      // Generate new embedding for the updated content
      const embedding = await generateEmbedding(content)

      // Update the document
      await db
        .update(vectorDocuments)
        .set({
          content,
          metadata: JSON.stringify(metadata),
          embedding: embedding,
          title: options.title,
          source: options.source,
          sourceType: options.sourceType,
          updatedAt: new Date(),
        })
        .where(and(eq(vectorDocuments.id, id), eq(vectorDocuments.userId, userId)))

      return { success: true }
    } catch (error) {
      console.error('Error updating document in vector store:', error)
      return { success: false }
    }
  }

  /**
   * Delete a document from the vector store
   */
  export async function deleteDocument(id: string, userId: string): Promise<{ success: boolean }> {
    try {
      await db
        .delete(vectorDocuments)
        .where(and(eq(vectorDocuments.id, id), eq(vectorDocuments.userId, userId)))

      return { success: true }
    } catch (error) {
      console.error('Error deleting document from vector store:', error)
      return { success: false }
    }
  }

  /**
   * Get documents by user ID
   */
  export async function getUserDocuments(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<VectorDocument[]> {
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
      console.error('Error fetching user documents:', error)
      return []
    }
  }
}
