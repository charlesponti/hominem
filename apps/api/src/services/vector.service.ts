import type { MultipartFile } from '@fastify/multipart'
import { logger } from '@ponti/utils/logger'
import { tool } from 'ai'
import { ChromaClient, IncludeEnum, OpenAIEmbeddingFunction } from 'chromadb'
import csv from 'csv-parser'
import crypto, { createHash } from 'node:crypto'
import fs from 'node:fs'
import { env } from 'src/lib/env'
import z from 'zod'

const embeddingFunction = new OpenAIEmbeddingFunction({
  openai_api_key: env.OPENAI_API_KEY,
  openai_model: 'text-embedding-3-small',
})

export namespace HominemVectorStore {
  export const embeddings = embeddingFunction

  export const chroma = new ChromaClient({
    path: env.CHROMA_URL,
  })

  // Create a custom tool for search
  export const searchDocumentsTool = tool({
    parameters: z.object({ query: z.string() }),
    description: 'Search the database for information',
    execute: async ({ query }: { query: string }) => {
      return await HominemVectorStore.searchDocuments(query)
    },
  })

  export async function getDocumentCollection(indexName: string) {
    return chroma.getOrCreateCollection({
      name: indexName,
      embeddingFunction,
    })
  }

  export async function upsertProfile(id: string, profile: string) {
    const collection = await chroma.getOrCreateCollection({
      name: 'profiles',
      embeddingFunction,
    })

    await collection.add({
      documents: [profile],
      ids: [id],
      metadatas: [{ id }],
    })

    return { count: 1 }
  }

  export async function upsertBatch(
    indexName: string,
    documents: Array<{ id: string; document: string; metadata?: Record<string, string | number> }>
  ) {
    try {
      const collection = await chroma.getOrCreateCollection({
        name: indexName,
        embeddingFunction,
      })

      await collection.add({
        documents: documents.map((v) => v.document),
        ids: documents.map((v) => v.id),
        metadatas: documents.map((v) => v.metadata || {}),
      })

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
    const collection = await chroma.getCollection({
      name: indexName,
      embeddingFunction,
    })

    const queryResults = await collection.query({
      nResults: limit,
      queryTexts: [q],
      include: [IncludeEnum.Distances, IncludeEnum.Metadatas, IncludeEnum.Documents],
    })
    const results = []

    // Transform to match the expected format for compatibility
    for (let i = 0; i < queryResults.ids.length; i++) {
      results.push({
        id: queryResults.ids[i],
        score: queryResults.distances?.[i],
        metadata: queryResults.metadatas[i],
        document: queryResults.documents[i],
      })
    }

    return { results }
  }

  export async function getImageEmbedding(image: MultipartFile): Promise<number[][]> {
    try {
      const buffer = await image.toBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const embeddingResponse = await embeddings.generate([base64])
      return embeddingResponse
    } catch (e) {
      logger.error(`Error embedding image, ${e}`)
      throw e
    }
  }

  export async function getEmbeddingsFromImage(imagePath: string): Promise<number[][]> {
    try {
      const imageBuffer = fs.readFileSync(imagePath)
      const base64 = imageBuffer.toString('base64')
      const embeddingResponse = await embeddings.generate([base64])
      return embeddingResponse
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
}
