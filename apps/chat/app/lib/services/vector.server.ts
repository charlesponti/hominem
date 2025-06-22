import { db } from '@hominem/utils/db'
import { vectorDocuments, type NewVectorDocument, type VectorDocument } from '@hominem/utils/schema'
import { tool } from 'ai'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { llm } from './llm.server'

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

export class VectorStore {
  private model = llm.getModel()

  /**
   * Generate embeddings for text using the AI package
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI's embeddings API directly since the AI package doesn't expose it yet
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text.replace(/\n/g, ' '), // Clean up newlines
          model: 'text-embedding-ada-002',
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Chunk large text into smaller segments for better embedding
   */
  private chunkText(text: string, maxChunkSize = 1500, overlap = 200): string[] {
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
   * Add a document to the vector store with embedding
   */
  async addDocument(
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
      const embedding = await this.generateEmbedding(content)

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
   * Search for similar documents using vector similarity
   */
  async searchDocuments(
    query: string,
    userId?: string,
    limit = 10,
    threshold = 0.7
  ): Promise<DocumentSearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query)

      // Build the SQL query with conditions
      const conditions = [
        sql`1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) >= ${threshold}`,
      ]

      if (userId) {
        conditions.push(eq(vectorDocuments.userId, userId))
      }

      // Execute the query
      const results = await db
        .select({
          id: vectorDocuments.id,
          score: sql<number>`1 - (embedding <=> ${JSON.stringify(queryEmbedding)})`,
          metadata: vectorDocuments.metadata,
          document: vectorDocuments.content,
          title: vectorDocuments.title,
          source: vectorDocuments.source,
          sourceType: vectorDocuments.sourceType,
        })
        .from(vectorDocuments)
        .where(and(...conditions))
        .orderBy(desc(sql`1 - (embedding <=> ${JSON.stringify(queryEmbedding)})`))
        .limit(limit)

      return results.map((result) => ({
        id: result.id,
        score: result.score,
        metadata: JSON.parse(result.metadata as string),
        document: result.document,
        title: result.title || undefined,
        source: result.source || undefined,
        sourceType: result.sourceType || undefined,
      }))
    } catch (error) {
      console.error('Error searching documents:', error)
      return []
    }
  }

  /**
   * Add multiple documents to the vector store
   */
  async addDocuments(
    documents: Array<{
      content: string
      userId: string
      metadata?: Record<string, string | number>
      title?: string
      source?: string
      sourceType?: string
    }>
  ): Promise<Array<{ success: boolean; id: string }>> {
    return Promise.all(
      documents.map((doc) =>
        this.addDocument(doc.content, doc.userId, doc.metadata || {}, {
          title: doc.title,
          source: doc.source,
          sourceType: doc.sourceType,
        })
      )
    )
  }
}

// Initialize the vector store instance
const vectorStore = new VectorStore()

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
   * Search documents using vector similarity with pgvector
   */
  export const searchDocuments = async (
    query: string,
    userId?: string,
    limit = 10,
    threshold = 0.7
  ): Promise<DocumentSearchResponse> => {
    try {
      const results = await vectorStore.searchDocuments(query, userId, limit, threshold)
      return { results }
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
    return vectorStore.addDocument(content, userId, metadata, options)
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
      const chunks = vectorStore.chunkText(content, maxChunkSize, overlap)
      const ids: string[] = []

      // Add each chunk as a separate document
      for (let i = 0; i < chunks.length; i++) {
        const chunkMetadata = {
          ...metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          isChunk: 1, // Use 1 instead of true for the boolean value
        }

        const result = await vectorStore.addDocument(chunks[i], userId, chunkMetadata, {
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
      // Update the document using the vector store
      await db
        .update(vectorDocuments)
        .set({
          content,
          metadata: JSON.stringify(metadata),
          title: options.title,
          source: options.source,
          sourceType: options.sourceType,
          updatedAt: new Date(),
        })
        .where(and(eq(vectorDocuments.id, id), eq(vectorDocuments.userId, userId)))

      // Re-add the document to update its embedding
      await vectorStore.addDocument(content, userId, metadata, options)

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

// Optionally export the singleton for direct use
export const vectorStoreInstance = vectorStore
